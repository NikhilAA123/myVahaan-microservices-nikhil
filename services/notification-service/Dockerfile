# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# The context is the project root, so we must provide the full path to the files.
COPY services/notification-service/package*.json ./

# Install dependencies
RUN npm install

# Copy all the source code FROM the notification-service directory INTO the container's WORKDIR.
COPY services/notification-service/src/. .

# This is a background service, so it just runs the consumer script
CMD ["node", "consumer.js"]
