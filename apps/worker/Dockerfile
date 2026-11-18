# Production Dockerfile for WhatsApp AI Automation Background Worker
FROM node:20-slim AS base

WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

# Stage 1: Build
FROM base AS builder
WORKDIR /app

# Copy complete monorepo source
COPY . .

# Clean install all dependencies
RUN npm ci

# Generate Prisma Client
RUN npm run db:generate

# Build all monorepo packages
RUN npm run build

# Stage 2: Production Runner
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker

CMD ["node", "apps/worker/dist/index.js"]
