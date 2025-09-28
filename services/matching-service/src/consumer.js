require("dotenv").config();
const { Kafka } = require("kafkajs");

// --- Kafka Consumer Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  clientId: "matching-service",
});

const consumer = kafka.consumer({ groupId: "ride-matchers" });
const producer = kafka.producer(); // We'll need this to send the next event

const main = async () => {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: "ride_requests", fromBeginning: true });

  console.log("✅ Matching service is listening for ride requests...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const request = JSON.parse(message.value.toString());
      console.log(`
      --------------------
      [Matching Service] Received a new ride request:
      Ride ID: ${request.rideId}
      Passenger ID: ${request.passengerId}
      Pickup Location: ${request.pickup.pickupLat}, ${request.pickup.pickupLng}
      --------------------
      `);

      // --- Core Matching Logic (MVP) ---
      // 1. Query the database to find available drivers near the pickup location.
      //    (We will implement the DB logic in the next step)
      console.log("[Matching Service] Searching for available drivers...");
      const fakeDriverId = "driver-abc-123"; // Placeholder

      // 2. If a driver is found, produce a new event to assign the ride.
      const assignmentPayload = {
        rideId: request.rideId,
        driverId: fakeDriverId,
        assignedAt: new Date().toISOString(),
      };

      await producer.send({
        topic: "driver_assignments",
        messages: [{ value: JSON.stringify(assignmentPayload) }],
      });

      console.log(
        `[Matching Service] Assigned ride ${request.rideId} to driver ${fakeDriverId}`
      );
    },
  });
};

main().catch((error) => {
  console.error("Error in matching service:", error);
  process.exit(1);
});
