require("dotenv").config();
const path = require("path");
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 8080;

const PROTO_DIR = path.resolve(__dirname, "..", "proto");
const AUTH_PROTO_PATH = path.join(PROTO_DIR, "auth.proto");
const RIDE_PROTO_PATH = path.join(PROTO_DIR, "ride.proto");

const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "auth-service:50051";
const RIDE_SERVICE_ADDR = process.env.RIDE_SERVICE_ADDR || "ride-service:50052";

// --- Middleware ---
app.use(express.json());

// --- gRPC Client Setup ---
const authPackageDef = protoLoader.loadSync(AUTH_PROTO_PATH);
// --- THIS IS THE FIX ---
// The variable name is now correct: 'authPackageDef'
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

const ridePackageDef = protoLoader.loadSync(RIDE_PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(ridePackageDef).ride;
const rideClient = new rideProto.RideService(
  RIDE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- Middleware Setup ---
const authMiddlewareFactory = require("./middleware/authMiddleware");
const authMiddleware = authMiddlewareFactory(authClient);

// --- API Routes ---
const authRoutesFactory = require("./routes/authRoutes");
const authRoutes = authRoutesFactory(authClient, authMiddleware);
app.use("/api/auth", authRoutes);

const rideRoutesFactory = require("./routes/rideRoutes");
const rideRoutes = rideRoutesFactory(rideClient, authMiddleware);
app.use("/api/rides", rideRoutes);

// --- Root Route for Sanity Check ---
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running!" });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on port ${PORT}`);
});
