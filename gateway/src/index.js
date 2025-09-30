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
const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "auth-service:50051";

// --- Middleware ---
app.use(express.json());

// --- gRPC Client Setup ---
const authPackageDef = protoLoader.loadSync(AUTH_PROTO_PATH);
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;
const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
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

// --- Root Route for Sanity Check ---
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running!" });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on port ${PORT}`);
});
