require("dotenv").config();
const path = require("path");
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 8080;

// Service addresses from environment variables, with defaults for local testing
const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "localhost:50051";
const RIDE_SERVICE_ADDR = process.env.RIDE_SERVICE_ADDR || "localhost:50052";

// --- THIS IS THE FINAL FIX ---
// This path logic tells Node.js to look for the 'proto' directory
// relative to the current file's location inside the container's /app directory.
const AUTH_PROTO_PATH = path.join(__dirname, "..", "proto", "auth.proto");
const RIDE_PROTO_PATH = path.join(__dirname, "..", "proto", "ride.proto");

// --- Middleware ---
app.use(express.json()); // Middleware to parse incoming JSON requests

// --- gRPC Client Setup ---

// Load the protobuf definitions for the auth service
const authPackageDef = protoLoader.loadSync(AUTH_PROTO_PATH);
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;
// Create the gRPC client for the auth service
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);
console.log(
  `✅ Gateway: Auth Service client configured for ${AUTH_SERVICE_ADDR}`
);

// Load the protobuf definitions for the ride service
const ridePackageDef = protoLoader.loadSync(RIDE_PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(ridePackageDef).ride;
// Create the gRPC client for the ride service
const rideClient = new rideProto.RideService(
  RIDE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);
console.log(
  `✅ Gateway: Ride Service client configured for ${RIDE_SERVICE_ADDR}`
);

// --- API Routes ---

// Default route for health checks
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running and healthy" });
});

// --- Auth Routes ---

app.post("/api/auth/register", (req, res) => {
  const { name, phone, email, password } = req.body;
  // Forward the HTTP request to the auth-service via a gRPC call
  authClient.Register({ name, phone, email, password }, (err, response) => {
    if (err) {
      console.error("❌ Gateway: gRPC Error during Register:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(response.status === "OK" ? 201 : 400).json(response);
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body; // Login with email
  // Forward the HTTP request to the auth-service via a gRPC call
  authClient.Login({ email, password }, (err, response) => {
    if (err) {
      console.error("❌ Gateway: gRPC Error during Login:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(response.status === "OK" ? 200 : 401).json(response);
  });
});

// --- Ride Routes ---

app.post("/api/rides/request", (req, res) => {
  // Note: In a real app, passengerId would come from a validated JWT, not the request body.
  const { passengerId, pickupLat, pickupLng, dropLat, dropLng } = req.body;

  // Forward the HTTP request to the ride-service via gRPC
  rideClient.RequestRide(
    { passengerId, pickupLat, pickupLng, dropLat, dropLng },
    (err, response) => {
      if (err) {
        console.error("❌ Gateway: gRPC Error during RequestRide:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.status(response.status === "OK" ? 200 : 400).json(response);
    }
  );
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on port ${PORT}`);
});
