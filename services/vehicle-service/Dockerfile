# --- STAGE 1: The "3D Printing Room" (Generate gRPC Code) ---
FROM namely/protoc-all:1.51_2 AS proto-builder

# Copy our .proto contracts into the builder's workspace.
COPY proto /defs/proto

# Run the "3D printer" command.
# This generates the Go files into the '/gen' directory.
RUN mkdir /gen && protoc -I /defs --go_out=/gen --go-grpc_out=/gen /defs/proto/vehicle.proto


# --- STAGE 2: The "Go Workshop" (Compile the Application) ---
FROM golang:1.24-alpine AS go-builder

WORKDIR /app

COPY services/vehicle-service/go.mod ./
COPY services/vehicle-service/go.sum ./

RUN go mod download

COPY services/vehicle-service/. .

# --- THIS IS THE FIX ---
# We tell the builder to copy the CONTENTS of the /gen directory (our .go files)
# from the proto-builder stage into a new /app/proto directory in this stage.
COPY --from=proto-builder /gen /app/proto

# Compile the final application binary.
RUN go build -o /app/vehicle-service .


# --- STAGE 3: The Final Product (The Tiny Running Container) ---
FROM alpine:latest

WORKDIR /app

# Copy ONLY the final, compiled program from our 'go-builder' stage.
COPY --from=go-builder /app/vehicle-service .

CMD ["./vehicle-service"]
