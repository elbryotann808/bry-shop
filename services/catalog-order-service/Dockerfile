FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci


COPY . .
RUN npm run build   # asume "build": "tsc -p tsconfig.json" o equivalente

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --production=true

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
