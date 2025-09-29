# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# --- FIX APPLIED HERE ---
# Since the context is the project root, we need to specify the path to the package files.
COPY services/auth-service/package*.json ./

# Install dependencies
RUN npm install

# Copy the shared 'proto' directory from the root context.
COPY proto ./proto

# Copy all the source code FROM the auth-service directory INTO the container's WORKDIR.
COPY services/auth-service/. .

# Expose gRPC port
EXPOSE 50051

# Default command to run the server
CMD ["node", "src/server.js"]

