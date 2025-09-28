require("dotenv").config();
const path = require("path");
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 8080;
// Path to the shared proto file
const PROTO_PATH = path.join(__dirname, "..", "..", "proto", "auth.proto");
// gRPC service address
const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "localhost:50051";

// --- Middleware ---
app.use(express.json());

// --- gRPC Client Setup ---
const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

// Create a gRPC client for the AuthService
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- Ride Service gRPC Client Setup ---
const RIDE_PROTO_PATH = path.join(__dirname, "..", "..", "proto", "ride.proto");
const RIDE_SERVICE_ADDR = process.env.RIDE_SERVICE_ADDR || "ride-service:50052";

const ridePackageDef = protoLoader.loadSync(RIDE_PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(ridePackageDef).ride;
const rideClient = new rideProto.RideService(
  RIDE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- Add New Ride Route ---
app.post("/api/rides/request", (req, res) => {
  // In a real app, you would get passengerId from a validated JWT
  const { passengerId, pickupLat, pickupLng, dropLat, dropLng } = req.body;

  rideClient.RequestRide(
    { passengerId, pickupLat, pickupLng, dropLat, dropLng },
    (err, response) => {
      if (err) {
        console.error("gRPC Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(response);
    }
  );
});

// --- API Routes ---

// Root route for testing
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running" });
});

// Registration Route
app.post("/api/auth/register", (req, res) => {
  // The request body from the client (e.g., React app)
  const { name, phone, email, password } = req.body;

  // Call the Register method on the auth-service via gRPC
  authClient.Register({ name, phone, email, password }, (err, response) => {
    if (err) {
      console.error("gRPC Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(response);
  });
});

// Login Route
app.post("/api/auth/login", (req, res) => {
  const { phone, password } = req.body;

  // Call the Login method on the auth-service via gRPC
  authClient.Login({ phone, password }, (err, response) => {
    if (err) {
      console.error("gRPC Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(response);
  });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
