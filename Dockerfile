# ==============================================================================
# Zelo - Dockerfile Multi-Stage de Produção
# Otimizado para Next.js 15 (App Router), Prisma ORM e pnpm
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Image: Node 20 no Alpine Linux (imagem ultra-leve e segura)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# Instala bibliotecas de compatibilidade C/C++ necessárias para Prisma e Alpine
RUN apk add --no-cache libc6-compat openssl

# Instala o gerenciador oficial pnpm globalmente
RUN npm install -g pnpm@latest

# ------------------------------------------------------------------------------
# 2. Dependencies Stage: Instalação com cache otimizado das dependências
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Instala ferramentas necessárias para módulos nativos (ex.: bcrypt)
RUN apk add --no-cache python3 make g++

# Copia apenas os manifestos de dependências para aproveitar o cache de camadas do Docker
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalação estrita baseada no lockfile sem alterar versões
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# 3. Builder Stage: Geração do Prisma e Compilação Standalone do Next.js
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copia os node_modules já resolvidos e o código-fonte da aplicação
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desativa telemetria do Next.js durante a compilação
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DOCKER_BUILD=1

# Gera o cliente tipado do Prisma para o ambiente Linux
RUN npx prisma generate

# Executa o build de produção (gera o bundle standalone otimizado)
RUN pnpm build

# ------------------------------------------------------------------------------
# 4. Runner Stage: Imagem final mínima e segura para execução em produção
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instala OpenSSL e compatibilidade de bibliotecas no container final
RUN apk add --no-cache libc6-compat openssl curl

# Cria usuário e grupo de sistema não-root por motivos de segurança (Princípio do Menor Privilégio)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia os arquivos estáticos e públicos
COPY --from=builder /app/public ./public

# Copia o servidor standalone gerado pelo Next.js (apenas os arquivos estritamente necessários)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Muda para o usuário não-root
USER nextjs

# Expõe a porta padrão do Next.js
EXPOSE 3000

# Healthcheck para monitoramento da saúde do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/sync || exit 1

# Comando de inicialização do servidor HTTP standalone
CMD ["node", "server.js"]
