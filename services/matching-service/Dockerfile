# Use Node.js 18 base image
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# This is a background service, so it just runs the consumer script
CMD ["node", "src/consumer.js"]