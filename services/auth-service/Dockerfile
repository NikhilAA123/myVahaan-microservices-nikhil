# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching npm install)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code into container
COPY . .

# Expose gRPC port (auth-service listens on 50051)
EXPOSE 50051

# Default command to run the server
CMD ["node", "src/server.js"]
