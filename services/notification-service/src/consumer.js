require("dotenv").config();
const { Kafka } = require("kafkajs");

// --- Kafka Consumer Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
  clientId: "notification-service",
});

const consumer = kafka.consumer({ groupId: "notification-group" });

async function connectWithRetry() {
  let retries = 5;
  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Notification-service: Connected to Kafka");
      return;
    } catch (err) {
      retries--;
      console.error(
        `❌ Notification-service: Failed to connect. Retries left: ${retries}`,
        err.message
      );
      if (retries === 0) {
        console.error(
          "❌ Notification-service: Could not connect to Kafka. Exiting."
        );
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}

const main = async () => {
  await connectWithRetry();

  // This consumer subscribes to the 'driver_assignments' topic
  await consumer.subscribe({
    topic: "driver_assignments",
    fromBeginning: true,
  });

  console.log("✅ Notification-service is listening for driver assignments...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const assignment = JSON.parse(message.value.toString());

      console.log(`
      --------------------
      [Notification Service] Received a new driver assignment:
      Ride ID: ${assignment.rideId}
      Driver ID: ${assignment.driverId}
      --------------------
      `);

      // --- This is where the real notification logic would go ---
      // 1. Fetch the passenger's details (e.g., their push notification token) from the database using the rideId.
      // 2. Fetch the driver's details (e.g., their name and car model) from the database using the driverId.
      // 3. Format a message: "Your driver, Ravi (Honda City), is on the way!"
      // 4. Send the message using a push notification service (like Firebase) or an SMS service (like Twilio).

      console.log(
        `[Notification Service] SIMULATING: Sending push notification for ride ${assignment.rideId} to passenger.`
      );
    },
  });
};

main().catch((error) => {
  console.error("Error in notification-service:", error);
  process.exit(1);
});
