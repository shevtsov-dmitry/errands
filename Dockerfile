# Stage 1: Build the Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY server.js ./

# SQLite DB persists here (mount a volume to /app/data in production)
ENV PORT=3000

# Traefik Labels (Ensure these match your docker-compose or Swarm setup)
LABEL traefik.enable="true"
LABEL traefik.http.routers.errands.rule="Host(`errands.shevts.ru`)"
LABEL traefik.http.routers.errands.entrypoints="websecure"
LABEL traefik.http.routers.errands.tls.certresolver="myresolver"
LABEL traefik.http.services.errands.loadbalancer.server.port="3000"

EXPOSE 3000
CMD ["node", "server.js"]
