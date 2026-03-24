# ---------- BUILD ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# ---------- RUN ----------
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/server.js"]