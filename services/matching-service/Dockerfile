# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# --- FIX APPLIED HERE ---
# Since the context is the project root, we must provide the full path to the files.
COPY services/matching-service/package*.json ./

# Install dependencies
RUN npm install

# Copy all the source code FROM the matching-service directory INTO the container's WORKDIR.
COPY services/matching-service/. .

# This is a background service, so it just runs the consumer script
CMD ["node", "src/consumer.js"]
