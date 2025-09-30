require("dotenv").config();
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Kafka } = require("kafkajs");
// --- We now import the Ride model to interact with our database.
const Ride = require("./models/ride.model");

const PROTO_PATH = path.join(__dirname, "..", "proto", "ride.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(packageDef).ride;

// Kafka setup (using the simple connection logic as requested)
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"], // Updated port
  clientId: "ride-service",
});
const producer = kafka.producer();

async function initKafka() {
  await producer.connect();
  console.log("✅ Ride-service: Kafka producer connected");
}
initKafka().catch((err) =>
  console.error("❌ Ride-service: Kafka init error", err)
);

const RideService = {
  RequestRide: async (call, callback) => {
    try {
      const { passengerId, pickupLat, pickupLng, dropLat, dropLng } =
        call.request;

      // 1. Save the new ride to the database using our model.
      // The database will automatically generate the ID.
      const newRide = await Ride.create({
        passengerId,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
      });
      console.log(`✅ Ride-service: New ride ${newRide.id} saved to database.`);

      // 2. Produce a 'ride_requests' event to Kafka.
      // We send the full ride object from the database, which is much more useful.
      await producer.send({
        topic: "ride_requests",
        messages: [{ value: JSON.stringify(newRide) }],
      });
      console.log(
        `✅ Ride-service: Produced ride_requests event for ride ${newRide.id}`
      );

      // 3. Send a successful response back to the gateway.
      callback(null, {
        status: "OK",
        rideId: newRide.id,
        message: "Ride has been successfully requested.",
      });
    } catch (err) {
      console.error("❌ Ride-service: Error during RequestRide:", err);
      callback({
        code: grpc.status.INTERNAL,
        details: "Failed to request ride",
      });
    }
  },
};

// Main server startup logic
async function main() {
  await initKafka();
  const server = new grpc.Server();
  server.addService(rideProto.RideService.service, RideService);
  const bindAddr = `0.0.0.0:50052`;
  server.bindAsync(
    bindAddr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        return console.error("❌ Ride-service: gRPC server error:", err);
      }
      server.start();
      console.log(`✅ Ride service gRPC listening on ${bindAddr}`);
    }
  );
}

main();
