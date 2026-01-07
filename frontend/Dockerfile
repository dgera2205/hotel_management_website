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

# Build argument for backend URL (needed at build time for Next.js rewrites)
ARG BACKEND_URL=http://localhost:8000
ENV BACKEND_URL=${BACKEND_URL}

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

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
