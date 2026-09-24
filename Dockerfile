# Build frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++

RUN npm ci

COPY . .

RUN npm run build


# Production server
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev

COPY src/server.js ./src/server.js
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/errands.db

LABEL traefik.enable="true"
LABEL traefik.http.routers.errands.rule="Host(`errands.shevts.ru`)"
LABEL traefik.http.routers.errands.entrypoints="websecure"
LABEL traefik.http.routers.errands.tls.certresolver="myresolver"
LABEL traefik.http.services.errands.loadbalancer.server.port="3000"

EXPOSE 3000

CMD ["node", "src/server.js"]
