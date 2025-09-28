// --- Core Dependencies ---
require("dotenv").config();
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Kafka } = require("kafkajs");
const jwt = require("jsonwebtoken");

// --- Internal Modules & Utilities ---
const User = require("./models/user.model");
const { hashPassword, comparePassword } = require("./utils/hash.util");

// --- gRPC and Proto Setup ---
const PROTO_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "proto",
  "auth.proto"
);
const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

// --- Kafka Producer Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});
const producer = kafka.producer();

// --- Main AuthService Implementation ---
const AuthService = {
  /**
   * Handles user registration.
   */
  Register: async (call, callback) => {
    try {
      const { name, phone, email, password } = call.request;

      // 1. Check if a user with the given email already exists in the database.
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: "User with this email already exists.",
        });
      }

      // 2. Hash the user's password using our tested utility.
      const passwordHash = hashPassword(password);

      // 3. Create the new user record in the database.
      const newUser = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "passenger",
      });

      // 4. Publish a 'user_registered' event to Kafka for other services to consume.
      await producer.send({
        topic: "user_events",
        messages: [
          {
            value: JSON.stringify({ event: "user_registered", user: newUser }),
          },
        ],
      });

      // 5. Send a successful response. It's best practice not to return a token here,
      //    forcing the client to perform a separate login action.
      callback(null, {
        status: "OK",
        message: "User registered successfully",
        token: "", // Explicitly empty
        userId: newUser.id,
      });
    } catch (err) {
      console.error("Registration Error:", err);
      callback({
        code: grpc.status.INTERNAL,
        message:
          err.message || "An internal error occurred during registration.",
      });
    }
  },

  /**
   * Handles user login.
   */
  Login: async (call, callback) => {
    try {
      // Your .proto file specifies login via 'phone', but email is more standard.
      // We'll treat the 'phone' field from the proto as 'email' for this logic.
      const { phone: email, password } = call.request;

      // 1. Find the user by their email in the database.
      const user = await User.findByEmail(email);
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: "User with this email not found.",
        });
      }

      // 2. Compare the provided password with the stored hash.
      const isPasswordValid = comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Invalid password.",
        });
      }

      // 3. If the password is valid, generate a JSON Web Token (JWT).
      const tokenPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || "supersecretkey", // Use the secret from your environment
        { expiresIn: "24h" } // Set an expiration time for the token
      );

      // 4. Send a successful response containing the token and user ID.
      callback(null, {
        status: "OK",
        message: "Logged in successfully",
        token: token,
        userId: user.id,
      });
    } catch (err) {
      console.error("Login Error:", err);
      callback({
        code: grpc.status.INTERNAL,
        message: err.message || "An internal error occurred during login.",
      });
    }
  },
};

/**
 * Starts the gRPC server and Kafka producer.
 */
async function main() {
  await producer.connect();
  console.log("Auth-service: Kafka producer connected successfully.");

  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, AuthService);

  const bindAddr = `0.0.0.0:50051`;
  server.bindAsync(
    bindAddr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("Failed to bind gRPC server:", err);
        return;
      }
      server.start();
      console.log(`Auth-service: gRPC server listening on ${bindAddr}`);
    }
  );
}

// Run the main function and handle any potential startup errors.
main().catch(console.error);
