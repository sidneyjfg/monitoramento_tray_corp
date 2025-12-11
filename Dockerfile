FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------------------------
# RUN TIME
# ---------------------------
FROM node:18-slim

WORKDIR /app

RUN npm install -g pm2

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json .

EXPOSE 3006

CMD ["pm2-runtime", "dist/server.js"]
