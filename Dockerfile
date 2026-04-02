# ==========================================
# Builder stage
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Adicionamos dependências necessárias para compilação e Prisma
RUN apk add --no-cache python3 make g++ openssl

COPY package.json package-lock.json* ./

# Aumentamos o timeout para evitar ETIMEDOUT em redes instáveis
RUN npm install --network-timeout=1000000

# Copia o restante do código
COPY . .

# Gera o client do Prisma e compila o NestJS
RUN npx prisma generate
RUN npm run build

# Remove dependências dev para menor imagem de runtime
RUN npm prune --production

# ==========================================
# Runtime stage
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Openssl para suporte TLS/SSL de DB
RUN apk add --no-cache openssl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

USER appuser

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

# Para Render, assegure que DATABASE_URL tenha sslaccept=strict
# Ex: mysql://user:pass@host:3306/db?sslaccept=strict
CMD ["node", "dist/main.js"]