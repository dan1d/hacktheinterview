FROM node:22-slim AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx vite build

EXPOSE 3001
CMD ["node", "--import", "tsx", "server/index.ts"]
