require("dotenv").config();
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const User = require("./models/user.model");
const { hashPassword, comparePassword } = require("./utils/hash.util");
const { Kafka } = require("kafkajs");
const jwt = require("jsonwebtoken");

const PROTO_PATH = path.join(__dirname, "..", "proto", "auth.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
  clientId: "auth-service",
});
const producer = kafka.producer();

async function initKafka() {
  let retries = 5;
  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Auth-service: Kafka producer connected");
      return;
    } catch (err) {
      retries--;
      console.error(
        `❌ Auth-service: Kafka connection failed. Retries left: ${retries}`
      );
      if (retries === 0) {
        console.error("❌ Auth-service: Could not connect to Kafka. Exiting.");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}

const AuthService = {
  Register: async (call, callback) => {
    try {
      console.log("Auth-service received Register request:", call.request);
      const { name, phone, email, password, role = "passenger" } = call.request;
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
        role,
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
      callback(null, {
        status: "OK",
        message: "User registered successfully",
        userId: newUser.id,
      });
    } catch (err) {
      console.error("❌ Auth-service: Register Error:", err);
      callback({ code: grpc.status.INTERNAL, details: "Register failed" });
    }
  },
  Login: async (call, callback) => {
    try {
      const { email, password } = call.request;
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
  ValidateToken: (call, callback) => {
    try {
      const { token } = call.request;

      if (!token) {
        return callback(null, {
          isValid: false,
          userId: "",
          role: "",
          error: "Token not provided",
        });
      }

      const decodedPayload = jwt.verify(
        token,
        process.env.JWT_SECRET || "supersecretkey"
      );

      callback(null, {
        isValid: true,
        userId: decodedPayload.userId,
        role: decodedPayload.role,
        error: "",
      });
    } catch (err) {
      console.error("❌ Auth-service: Invalid token:", err.message);
      callback(null, {
        isValid: false,
        userId: "",
        role: "",
        error: "Invalid or expired token",
      });
    }
  },
};

async function main() {
  await initKafka();
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, AuthService);
  const bindAddr = `0.0.0.0:50051`;
  server.bindAsync(
    bindAddr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        return console.error("❌ Auth-service: gRPC server error:", err);
      }
      console.log(`✅ Auth service gRPC listening on ${bindAddr}`);
    }
  );
}

main();
