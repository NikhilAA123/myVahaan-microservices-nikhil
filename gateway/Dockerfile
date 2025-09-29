# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# --- THIS IS THE FIX ---
# Since the context is the project root, we need to specify the path to the package files.
COPY gateway/package*.json ./

# Install dependencies
RUN npm install

# Copy the shared 'proto' directory from the root context.
COPY proto ./proto

# Copy all the source code FROM the gateway directory INTO the container's WORKDIR.
COPY gateway/. .

# Expose the gateway's HTTP port
EXPOSE 8080

# Default command to run the server
CMD ["node", "src/index.js"]

