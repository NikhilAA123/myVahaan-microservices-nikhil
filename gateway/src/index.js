require("dotenv").config();
const path = require("path");
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 8080;

// --- CORRECTED PROTO PATH ---
// We need to go up from 'src' to the project root, then into 'proto'
const PROTO_PATH = path.join(__dirname, "..", "..", "proto", "auth.proto");
const RIDE_PROTO_PATH = path.join(__dirname, "..", "..", "proto", "ride.proto");

const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "auth-service:50051";
const RIDE_SERVICE_ADDR = process.env.RIDE_SERVICE_ADDR || "ride-service:50052";

// --- Middleware ---
app.use(express.json());

// --- gRPC Client Setup for Auth Service ---
const authPackageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- gRPC Client Setup for Ride Service ---
const ridePackageDef = protoLoader.loadSync(RIDE_PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(ridePackageDef).ride;
const rideClient = new rideProto.RideService(
  RIDE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- API Routes ---
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running" });
});

// Auth Routes
app.post("/api/auth/register", (req, res) => {
  const { name, phone, email, password } = req.body;
  authClient.Register({ name, phone, email, password }, (err, response) => {
    if (err) {
      console.error("gRPC Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(response);
  });
});

app.post("/api/auth/login", (req, res) => {
  const { phone, password } = req.body;
  authClient.Login({ phone, password }, (err, response) => {
    if (err) {
      console.error("gRPC Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(response);
  });
});

// Ride Routes
app.post("/api/rides/request", (req, res) => {
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

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
