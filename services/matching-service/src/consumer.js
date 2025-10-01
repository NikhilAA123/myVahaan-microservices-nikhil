require("dotenv").config();
const { Kafka } = require("kafkajs");
const Driver = require("./models/driver.model");

// --- THIS IS THE FIX: The "Ingredient List" ---
// We must create the Kafka instance, consumer, and producer here
// in the global scope so all our functions can access them.
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
  clientId: "matching-service",
});
const consumer = kafka.consumer({ groupId: "ride-matchers" });
const producer = kafka.producer();

// This function now correctly uses the 'consumer' and 'producer' defined above.
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

  console.log("⏳ Waiting for Kafka to stabilize before consuming...");
  await new Promise((res) => setTimeout(res, 5000));

  console.log("✅ Matching service is listening for ride requests...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const rideRequest = JSON.parse(message.value.toString());
      console.log(
        `[Matching Service] Received a new ride request: ${rideRequest.id}`
      );

      // Look for a real driver in the database.
      console.log(
        "[Matching Service] Searching for an available driver in the database..."
      );
      const availableDriver = await Driver.findAvailableDriver();

      if (availableDriver) {
        // If a driver is found, assign them the ride.
        console.log(
          `[Matching Service] Found available driver: ${availableDriver.name} (${availableDriver.id})`
        );

        const assignmentPayload = {
          rideId: rideRequest.id,
          driverId: availableDriver.id,
          assignedAt: new Date().toISOString(),
        };

        await producer.send({
          topic: "driver_assignments",
          messages: [{ value: JSON.stringify(assignmentPayload) }],
        });

        console.log(
          `[Matching Service] Assigned ride ${rideRequest.id} to driver ${availableDriver.id}`
        );
      } else {
        // If no drivers are available, log it.
        console.log(
          `[Matching Service] No available drivers found for ride ${rideRequest.id}.`
        );
      }
    },
  });
};

main().catch((error) => {
  console.error("Error in matching service:", error);
  process.exit(1);
});
