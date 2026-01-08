FROM node:20-alpine

WORKDIR /app

# Backend URL for API proxy (used by rewrites in local/Docker dev)
ARG BACKEND_URL=http://localhost:8000
ENV BACKEND_URL=${BACKEND_URL}

# Public API URL for direct backend calls (used in cloud deployments)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Debug: Print the API URL being used
RUN echo "NEXT_PUBLIC_API_URL is: $NEXT_PUBLIC_API_URL"

# Build with reduced memory
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
