# Образ для облака (Railway, Fly.io, VPS с Docker).
# Корень сервиса в панели: star-oracle/backend

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# Порт подставит хостинг (Railway/Render); локально по умолчанию 3001 в server.js
EXPOSE 3001

CMD ["node", "server.js"]
