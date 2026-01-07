FROM node:20-alpine

WORKDIR /app

# Backend URL for API proxy
ARG BACKEND_URL=http://localhost:8000
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build with reduced memory
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
