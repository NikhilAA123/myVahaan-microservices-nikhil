# --- THIS IS THE FIX ---
# We are upgrading our "Go toolkit" from version 1.22 to 1.23
# to meet the requirements of the gRPC library.
FROM golang:1.23-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the dependency list files first.
COPY services/vehicle-service/go.mod ./
COPY services/vehicle-service/go.sum ./

# Download all the libraries listed in go.mod.
RUN go mod download

# Copy the source code and contracts.
COPY services/vehicle-service/. .
COPY proto ./proto

# Compile the application.
# --- FIX: Update the build path to be relative to the WORKDIR ---
RUN go build -o /app/vehicle-service .


# --- Optimization Stage (remains the same) ---
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/vehicle-service .
CMD ["./vehicle-service"]