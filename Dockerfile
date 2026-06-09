# Multi-stage build dla Next.js (output: standalone). Działa na Coolify i Vercel-like.
FROM node:22-alpine AS base

# --- Zależności ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholdery dla walidacji env podczas buildu (prawdziwe wartości wstrzykuje platforma w runtime).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AUTH_SECRET="build-time-placeholder-change-in-runtime"
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate uruchamiane w skrypcie build
RUN npm run build

# --- Migrator (pełne zależności; uruchamia `prisma migrate deploy`) ---
# Używany jako osobny krok deployu (compose: usługa `migrate`; Coolify: pre-deploy).
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY package.json ./package.json
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Runtime (slim; tylko serwer) ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Migracje uruchamiaj osobno (etap `migrator`), potem serwer:
CMD ["node", "server.js"]
