# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# --- FIX APPLIED HERE ---
# Since the context is the project root, we must provide the full path to the files.
COPY services/ride-service/package*.json ./

# Install dependencies
RUN npm install

# Copy the shared 'proto' directory from the root context.
COPY proto ./proto

# Copy all the source code FROM the ride-service directory INTO the container's WORKDIR.
COPY services/ride-service/. .

# Expose gRPC port
EXPOSE 50052

# Default command to run the server
CMD ["node", "src/server.js"]

