require("dotenv").config();
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Kafka } = require("kafkajs");
const User = require("./models/user.model");
const { hashPassword, comparePassword } = require("./utils/hash.util");

// --- THIS IS THE FINAL FIX ---
// This path logic tells Node.js to look for the 'proto' directory
// relative to the current file's location inside the container's /app directory.
const PROTO_PATH = path.join(__dirname, "..", "proto", "auth.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

// Kafka init
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});
const producer = kafka.producer();

async function initKafka() {
  await producer.connect();
  console.log("✅ Auth-service: Kafka producer connected");
}
initKafka().catch((err) => {
  console.error("❌ Auth-service: Kafka init error", err);
  process.exit(1);
});

const AuthService = {
  Register: async (call, callback) => {
    try {
      const { name, phone, email, password } = call.request;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return callback(null, {
          status: "ERROR",
          message: "User with this email already exists.",
        });
      }

      const passwordHash = await hashPassword(password);
      const newUser = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "passenger",
      });

      await producer.send({
        topic: "user_events",
        messages: [
          {
            value: JSON.stringify({ event: "user_registered", user: newUser }),
          },
        ],
      });
      console.log(
        `✅ Auth-service: Produced user_registered event for ${newUser.id}`
      );

      // Don't send token on register, force login for security
      callback(null, {
        status: "OK",
        message: "User registered successfully",
        token: "",
        userId: newUser.id,
      });
    } catch (err) {
      console.error("❌ Auth-service: Register Error:", err);
      callback({ code: grpc.status.INTERNAL, details: "Register failed" });
    }
  },

  Login: async (call, callback) => {
    try {
      const { email, password } = call.request; // Corrected to get email from request
      const user = await User.findByEmail(email);

      if (!user) {
        return callback(null, { status: "ERROR", message: "User not found." });
      }

      const isPasswordValid = await comparePassword(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return callback(null, {
          status: "ERROR",
          message: "Invalid password.",
        });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "1h" }
      );

      callback(null, {
        status: "OK",
        message: "Logged in successfully",
        token,
        userId: user.id,
      });
    } catch (err) {
      console.error("❌ Auth-service: Login Error:", err);
      callback({ code: grpc.status.INTERNAL, details: "Login failed" });
    }
  },
};

function main() {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, AuthService);
  const bindAddr = `0.0.0.0:50051`;
  server.bindAsync(
    bindAddr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("❌ Auth-service: gRPC server error:", err);
        return;
      }
      server.start();
      console.log(`✅ Auth service gRPC listening on ${bindAddr}`);
    }
  );
}

main();
