# =============================================================================
# Development Stage
# =============================================================================
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Environment variables for development
ENV WATCHPACK_POLLING=true
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

# Switch to non-root user
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
