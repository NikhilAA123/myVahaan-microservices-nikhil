const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(__dirname, "..", "proto", "auth.proto");
const AUTH_SERVICE_ADDR = "auth-service:50051";

const packageDef = protoLoader.loadSync(PROTO_PATH);
const authProto = grpc.loadPackageDefinition(packageDef).auth;

const authClient = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

console.log("🚀 Tester: Attempting to register a driver...");

const driverDetails = {
  name: "Direct Test Driver",
  email: "direct.driver@example.com",
  password: "password123",
  phone: "1110001110",
  role: "driver", // We are explicitly sending the role
};

authClient.Register(driverDetails, (err, response) => {
  if (err) {
    console.error("❌ Tester: gRPC call failed:", err);
    return;
  }
  console.log("✅ Tester: gRPC call successful. Response:", response);
});
