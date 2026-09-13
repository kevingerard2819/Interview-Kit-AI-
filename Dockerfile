# Multi-stage production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and client packages
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci

# Copy full source
COPY . .

# Build server and client
RUN npm run build:server
RUN npm run build:client

# Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/package*.json ./client/
COPY --from=builder /app/client/node_modules ./client/node_modules

EXPOSE 3000
EXPOSE 5000

CMD ["npm", "run", "start"]
