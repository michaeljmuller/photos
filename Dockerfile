# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
# Build tools required to compile native modules (better-sqlite3, sharp)
# when prebuilt binaries are unavailable for the target platform.
RUN apk add --no-cache python3 make g++
COPY web/package*.json ./
RUN npm install --legacy-peer-deps

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && mkdir -p /app/public

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libheif && addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN --mount=from=builder,source=/app/public,target=/tmp/public cp -r /tmp/public/. ./public 2>/dev/null || true

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
