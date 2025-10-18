const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const h3 = require("h3-js");

const PROTO_PATH = path.join(__dirname, "..", "proto", "vehicle.proto");
const VEHICLE_SERVICE_ADDR = "localhost:50053";

// --- THIS IS THE FIX ---
// Paste the real driver's ID here, between the quotes.
const DRIVER_ID = "58635eaa-25e2-4a13-98e4-fb65d6643f77";
// ---------------------

// This check now correctly looks for the placeholder text.
if (DRIVER_ID === "YOUR_DRIVER_ID_HERE" || DRIVER_ID === "") {
  console.error(
    "❌ Please open test-vehicle.js and replace 'YOUR_DRIVER_ID_HERE' with a real driver ID from your API response."
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

// We are intentionally using a single location for a predictable test.
const locations = [
  { lat: 12.9716, lng: 77.5946 }, // Cubbon Park
];
let locationIndex = 0;

const interval = setInterval(() => {
  const currentLocation = locations[locationIndex];
  const h3Index = h3.latLngToCell(currentLocation.lat, currentLocation.lng, 9);

  console.log(`Sending update: Driver ${DRIVER_ID} is at H3 Index ${h3Index}`);

  stream.write({
    driverId: DRIVER_ID,
    h3Index: h3Index,
    timestamp: Date.now(),
  });

  locationIndex = (locationIndex + 1) % locations.length;
}, 3000);

setTimeout(() => {
  clearInterval(interval);
  stream.end();
  console.log("🛑 Fake Driver App: Stopping location stream.");
}, 20000);
