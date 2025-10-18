require("dotenv").config();
const { Kafka } = require("kafkajs");
const Driver = require("./models/driver.model"); // The model to find drivers in the DB
const h3 = require("h3-js"); // The library for geospatial indexing

// --- Kafka Setup ---
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
  clientId: "matching-service",
});
const consumer = kafka.consumer({ groupId: "ride-matchers" });
const producer = kafka.producer();

// Patient Kafka connection logic
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

  // Stabilization delay to allow Kafka group coordinators to elect
  console.log("⏳ Waiting for Kafka to stabilize before consuming...");
  await new Promise((res) => setTimeout(res, 5000));

  console.log("✅ Matching service is listening for ride requests...");

  await consumer.run({
    // This function is executed for every new ride request event
    eachMessage: async ({ topic, partition, message }) => {
      const rideRequest = JSON.parse(message.value.toString());
      console.log(
        `[Matching Service] Received a new ride request: ${rideRequest.id}`
      );

      // --- THIS IS THE NEW, SMART LOGIC ---
      const passengerLat = rideRequest.pickup_lat;
      const passengerLng = rideRequest.pickup_lng;

      // 1. Convert the PASSENGER's location to an H3 hexagon index.
      // Resolution 9 is a hexagon with an approximate edge length of 175 meters.
      const passengerH3Index = h3.latLngToCell(passengerLat, passengerLng, 9);

      // 2. Get the passenger's hexagon AND all its immediate neighbors to create a search area.
      // A k-ring of 1 includes the center hexagon plus all its direct neighbors (7 total hexagons).
      const searchAreaHexagons = h3.gridDisk(passengerH3Index, 1);
      console.log(
        `[Matching Service] Searching for drivers in H3 hexagons: ${searchAreaHexagons}`
      );

      // 3. Find available drivers within this geographic area using our new model function.
      const availableDrivers = await Driver.findAvailableDriversInHexagons(
        searchAreaHexagons
      );

      if (availableDrivers.length > 0) {
        // 4. If drivers are found, pick the best one. For our MVP, we'll just pick the first one.
        // (A future upgrade could calculate the exact distance to each and pick the closest).
        const assignedDriver = availableDrivers[0];
        console.log(
          `[Matching Service] Found available driver: ${assignedDriver.name} (${assignedDriver.id})`
        );

        // 5. Produce a new event to notify the system of the assignment.
        const assignmentPayload = {
          rideId: rideRequest.id,
          driverId: assignedDriver.id,
          assignedAt: new Date().toISOString(),
        };

        await producer.send({
          topic: "driver_assignments",
          messages: [{ value: JSON.stringify(assignmentPayload) }],
        });

        console.log(
          `[Matching Service] Assigned ride ${rideRequest.id} to driver ${assignedDriver.id}`
        );
      } else {
        // 6. If no drivers are found in the immediate area, log it.
        console.log(
          `[Matching Service] No available drivers found for ride ${rideRequest.id}.`
        );
        // In a real system, you might put the ride back in a queue to retry later or expand the search radius.
      }
    },
  });
};

main().catch((error) => {
  console.error("Error in matching service:", error);
  process.exit(1);
});
