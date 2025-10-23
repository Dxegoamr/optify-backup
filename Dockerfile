# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for build step)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (informational, Cloud Run uses $PORT)
EXPOSE 8080

# Start the HTTP server (reads PORT from environment)
CMD ["npm", "run", "start"]

