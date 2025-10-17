const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const h3 = require("h3-js");

const PROTO_PATH = path.join(__dirname, "..", "proto", "vehicle.proto");
// The port we defined for the Go service in docker-compose.yml
const VEHICLE_SERVICE_ADDR = "localhost:50053";

// --- IMPORTANT: PASTE YOUR DRIVER'S ID HERE ---
// Get this ID from the response when you register a new driver.
const DRIVER_ID = "YOUR_DRIVER_ID_HERE";
// -----------------------------------------

if (DRIVER_ID === "YOUR_DRIVER_ID_HERE") {
  console.error(
    "❌ Please open test-vehicle.js and replace 'YOUR_DRIVER_ID_HERE' with a real driver ID."
  );
  process.exit(1);
}

const packageDef = protoLoader.loadSync(PROTO_PATH);
const vehicleProto = grpc.loadPackageDefinition(packageDef).vehicle;

const client = new vehicleProto.VehicleService(
  VEHICLE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

console.log("🚀 Fake Driver App: Starting location stream...");

const stream = client.UpdateLocation((err, response) => {
  if (err) {
    console.error("❌ Stream error:", err);
  } else {
    console.log("✅ Stream closed by server. Response:", response);
  }
});

// Simulate a driver moving around Bengaluru
const locations = [
  { lat: 12.9716, lng: 77.5946 }, // Cubbon Park
  { lat: 12.9759, lng: 77.5921 }, // Vidhana Soudha
  { lat: 12.9797, lng: 77.5970 }, // Bangalore Palace
  { lat: 12.9507, lng: 77.5848 }, // Lalbagh Botanical Garden
];
let locationIndex = 0;

// Every 3 seconds, send a new location update.
const interval = setInterval(() => {
  const currentLocation = locations[locationIndex];
  const h3Index = h3.latLngToCell(currentLocation.lat, currentLocation.lng, 9);

  console.log(
    `Sending update: Driver ${DRIVER_ID} is at H3 Index ${h3Index}`
  );

  stream.write({
    driverId: DRIVER_ID,
    h3Index: h3Index,
    timestamp: Date.now(),
  });

  locationIndex = (locationIndex + 1) % locations.length;
}, 3000);

// After 20 seconds, the driver "goes offline" and closes the stream.
setTimeout(() => {
  clearInterval(interval);
  stream.end();
  console.log("🛑 Fake Driver App: Stopping location stream.");
}, 20000);
