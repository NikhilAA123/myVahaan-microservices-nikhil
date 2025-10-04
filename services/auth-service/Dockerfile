# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# The context is the project root (.), so we must provide the full path to the files.
COPY services/auth-service/package*.json ./

# Install dependencies
RUN npm install

# Copy the shared 'proto' directory from the root context.
COPY proto ./proto

# Copy all the source code FROM the auth-service directory INTO the container's WORKDIR.
COPY services/auth-service/. .

# Default command to run the server
CMD ["node", "src/server.js"]
