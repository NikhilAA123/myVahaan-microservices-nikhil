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

// --- API Routes ---
const authRoutes = require("./routes/authRoutes");
// This line "injects" the authClient tool into the router.
app.use("/api/auth", authRoutes(authClient));

// --- Root Route for Sanity Check ---
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running!" });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on port ${PORT}`);
});
