# ==========================================
# Builder stage
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Adicionamos dependências necessárias para compilação e Prisma
RUN apk add --no-cache python3 make g++ openssl

# Copia apenas os arquivos de configuração de pacotes primeiro
COPY package.json package-lock.json* ./

# 🚨 A MÁGICA: Copia a pasta prisma ANTES da instalação!
# Se você tiver um "postinstall: prisma generate" no package.json, ele não vai quebrar.
COPY prisma ./prisma/

# Substituímos o "npm install" pelo "npm ci" com flags de otimização
# O "npm ci" é mais rápido, estrito e consome muito menos RAM (perfeito para o Render)
RUN npm ci --prefer-offline --no-audit

# Gera o client do Prisma explicitamente (garantia de funcionamento no Alpine)
RUN npx prisma generate

# Copia o restante do código fonte
COPY . .

# Compila o projeto NestJS
RUN npm run build

# Remove dependências de desenvolvimento para deixar a imagem de runtime super leve
RUN npm prune --production

# ==========================================
# Runtime stage
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Openssl para suporte TLS/SSL de banco de dados no Prisma
RUN apk add --no-cache openssl

# Usuário seguro para rodar a aplicação em produção
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia SOMENTE o necessário do estágio de builder
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

USER appuser

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicialização
# Lembrete pro Render: garanta que a var de ambiente DATABASE_URL no dashboard esteja correta
CMD ["node", "dist/main.js"]