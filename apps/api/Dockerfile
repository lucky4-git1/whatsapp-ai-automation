# Production Dockerfile for WhatsApp AI Automation API
FROM node:20-slim AS base

WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Stage 1: Build
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm ci --include=dev
RUN npm run db:generate
RUN npx turbo run build --filter=@whatsapp-automation/api...

# Stage 2: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
