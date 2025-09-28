require("dotenv").config();
const path = require("path");
const PROTO_PATH = path.join(__dirname, "..", "proto", "auth.proto");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Kafka } = require("kafkajs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

// Kafka init
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});
const producer = kafka.producer();

async function initKafka() {
  await producer.connect();
  console.log("Auth-service: Kafka producer connected");
}
initKafka().catch((err) => console.error("Kafka init error", err));

const AuthService = {
  Register: async (call, callback) => {
    try {
      const { name, phone, email, password } = call.request;
      // In Day-1 we store no DB yet — just create a fake user and token
      const userId = uuidv4();
      const hashed = bcrypt.hashSync(password, 8);
      const token = jwt.sign(
        { userId, role: "passenger" },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "1h" }
      );

      // optional: produce a "user_registered" event to Kafka
      await producer.send({
        topic: "user_events",
        messages: [
          {
            value: JSON.stringify({
              event: "user_registered",
              userId,
              name,
              email,
              phone,
            }),
          },
        ],
      });

      callback(null, { status: "OK", message: "Registered", token, userId });
    } catch (err) {
      callback(null, {
        status: "ERROR",
        message: err.message || "Register failed",
      });
    }
  },

  Login: async (call, callback) => {
    const { phone, password } = call.request;
    // Day-1: skip DB lookup; just return a fake token for the demo
    const userId = uuidv4();
    const token = jwt.sign(
      { userId, role: "passenger" },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "1h" }
    );
    callback(null, {
      status: "OK",
      message: "Logged in (demo)",
      token,
      userId,
    });
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
      if (err) return console.error(err);
      server.start();
      console.log(`Auth service gRPC listening on ${bindAddr}`);
    }
  );
}

main();
