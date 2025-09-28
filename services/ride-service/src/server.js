require("dotenv").config();
const path = require("path");
const PROTO_PATH = path.join(__dirname, "..", "proto", "ride.proto");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(packageDef).ride;

// Kafka init
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});
const producer = kafka.producer();

async function initKafka() {
  await producer.connect();
  console.log("Ride-service: Kafka producer connected");
}
initKafka().catch((err) => console.error("Kafka init error", err));

const RideService = {
  RequestRide: async (call, callback) => {
    try {
      const { passengerId, pickupLat, pickupLng, dropLat, dropLng } =
        call.request;
      const rideId = uuidv4();

      // Produce a ride_requests event
      const payload = {
        rideId,
        passengerId,
        pickup: { pickupLat, pickupLng },
        drop: { dropLat, dropLng },
        createdAt: new Date().toISOString(),
      };
      await producer.send({
        topic: "ride_requests",
        messages: [{ value: JSON.stringify(payload) }],
      });

      callback(null, {
        status: "OK",
        rideId,
        message: "Ride requested and event produced",
      });
    } catch (err) {
      callback(null, {
        status: "ERROR",
        rideId: "",
        message: err.message || "Request failed",
      });
    }
  },
};

function main() {
  const server = new grpc.Server();
  server.addService(rideProto.RideService.service, RideService);
  const bindAddr = `0.0.0.0:50052`;
  server.bindAsync(
    bindAddr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) return console.error(err);
      server.start();
      console.log(`Ride service gRPC listening on ${bindAddr}`);
    }
  );
}

main();
