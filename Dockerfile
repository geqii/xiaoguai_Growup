FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY dist ./dist
COPY src ./src

RUN mkdir -p /app/data /app/backups /app/logs /app/src/uploads

ENV NODE_ENV=production
ENV PORT=3001
ENV MISTAKE_DB_PATH=/app/data/mistakes.db
ENV MISTAKE_BACKUP_DIR=/app/backups

EXPOSE 3001

CMD ["node", "src/server/index.js"]
