require("dotenv").config();
const { Kafka } = require("kafkajs");

// --- Kafka Consumer Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
  clientId: "matching-service",
});

const consumer = kafka.consumer({ groupId: "ride-matchers" });
const producer = kafka.producer();

async function connectWithRetry() {
  let retries = 5;
  while (retries > 0) {
    try {
      await consumer.connect();
      await producer.connect();
      console.log("✅ Matching service: Connected to Kafka");
      return;
    } catch (err) {
      retries--;
      console.error(
        `❌ Matching service: Failed to connect to Kafka. Retrying in 5 seconds...`,
        err.message
      );
      if (retries === 0) {
        console.error(
          "❌ Matching service: Could not connect to Kafka after multiple retries. Exiting."
        );
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}

const main = async () => {
  await connectWithRetry();
  await consumer.subscribe({ topic: "ride_requests", fromBeginning: true });

  console.log("✅ Matching service is listening for ride requests...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const request = JSON.parse(message.value.toString());

      // --- THIS IS THE FIX ---
      // We are now reading the flat, snake_case properties directly from the message,
      // which matches the data format coming from the 'rides' table in Postgres.
      console.log(`
      --------------------
      [Matching Service] Received a new ride request:
      Ride ID: ${request.id}
      Passenger ID: ${request.passenger_id}
      Pickup Location: ${request.pickup_lat}, ${request.pickup_lng}
      --------------------
      `);

      // --- Core Matching Logic (MVP) ---
      console.log("[Matching Service] Searching for available drivers...");
      const fakeDriverId = "driver-abc-123"; // Placeholder for now

      // Produce a new event to assign the ride.
      const assignmentPayload = {
        rideId: request.id,
        driverId: fakeDriverId,
        assignedAt: new Date().toISOString(),
      };

      await producer.send({
        topic: "driver_assignments",
        messages: [{ value: JSON.stringify(assignmentPayload) }],
      });

      console.log(
        `[Matching Service] Assigned ride ${request.id} to driver ${fakeDriverId}`
      );
    },
  });
};

main().catch((error) => {
  console.error("Error in matching service:", error);
  process.exit(1);
});
