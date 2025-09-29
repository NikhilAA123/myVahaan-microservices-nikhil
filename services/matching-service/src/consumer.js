require("dotenv").config();
const { Kafka } = require("kafkajs");

// --- Kafka Consumer Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  clientId: "matching-service",
});

const consumer = kafka.consumer({ groupId: "ride-matchers" });
const producer = kafka.producer();

// --- Utility function for creating a delay ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main function to connect to Kafka and run the consumer.
 * This function includes a robust retry loop for the initial connection.
 */
const main = async () => {
  // --- Connection Retry Loop ---
  let connected = false;
  while (!connected) {
    try {
      await consumer.connect();
      await producer.connect();
      connected = true; // If connection succeeds, exit the loop
      console.log("✅ Matching service: Connected to Kafka successfully.");
    } catch (error) {
      console.error(
        "❌ Matching service: Failed to connect to Kafka. Retrying in 5 seconds...",
        error.message
      );
      await sleep(5000); // Wait for 5 seconds before trying again
    }
  }

  // --- Subscribe to the topic once connected ---
  await consumer.subscribe({ topic: "ride_requests", fromBeginning: true });
  console.log("✅ Matching service is listening for ride requests...");

  // --- Run the consumer to process messages ---
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
      console.log("[Matching Service] Searching for available drivers...");
      const fakeDriverId = "driver-abc-123"; // Placeholder for DB query

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

// --- Graceful Shutdown ---
const shutdown = async () => {
  console.log("Shutting down matching service...");
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// --- Start the Service ---
main().catch((error) => {
  console.error("Critical error in matching service:", error);
  process.exit(1);
});
