# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code into container
COPY . .

# Expose the gateway's HTTP port
EXPOSE 8080

# Default command to run the server
CMD ["node", "src/index.js"]