const path = require("path");
const PROTO_PATH = path.join(__dirname, "..", "proto", "ride.proto");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const rideProto = grpc.loadPackageDefinition(packageDef).ride;

const client = new rideProto.RideService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

client.RequestRide(
  {
    passengerId: "demo-user",
    pickupLat: 26.8467,
    pickupLng: 80.9462,
    dropLat: 27.1767,
    dropLng: 78.0081,
  },
  (err, res) => {
    if (err) return console.error("gRPC error", err);
    console.log("Ride response:", res);
  }
);
