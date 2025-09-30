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
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

// --- THIS IS NEW: We create the client for the ride-service ---
const ridePackageDef = protoLoader.loadSync(RIDE_PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(ridePackageDef).ride;
const rideClient = new rideProto.RideService(
  RIDE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);
// --- THIS IS THE NEW PART ---
// 1. Import the middleware "factory function". This is the blueprint for our bouncer.
const authMiddlewareFactory = require("./middleware/authMiddleware");
// 2. Create our actual "bouncer" instance by giving it the tool it needs (the gRPC client).
const authMiddleware = authMiddlewareFactory(authClient);

// --- API Routes ---
// 3. Import the routes "factory function".
const authRoutesFactory = require("./routes/authRoutes");
// 4. Create our router, giving it BOTH the gRPC client and our new bouncer.
const authRoutes = authRoutesFactory(authClient, authMiddleware);
app.use("/api/auth", authRoutes);

// --- THIS IS NEW: We "plug in" the new rideRoutes ---
const rideRoutesFactory = require("./routes/rideRoutes");
const rideRoutes = rideRoutesFactory(rideClient, authMiddleware);
app.use("/api/rides", rideRoutes); // Any URL starting with /api/rides will be handled here

// --- Root Route for Sanity Check ---
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running!" });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on port ${PORT}`);
});
