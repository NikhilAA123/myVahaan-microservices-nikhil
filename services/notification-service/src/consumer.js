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

  await consumer.subscribe({
    topic: "driver_assignments",
    fromBeginning: true,
  });

  // --- THIS IS THE FIX ---
  // We add a short delay here. This gives the Kafka broker a few extra seconds
  // to finish its internal startup, like electing group coordinators,
  // before our consumer tries to join a group. This prevents the crash.
  console.log(
    "⏳ Notification-service: Waiting for Kafka to stabilize before consuming..."
  );
  await new Promise((res) => setTimeout(res, 5000)); // 5-second stabilization delay

  console.log(
    "✅ Notification-service is now listening for driver assignments..."
  );

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
