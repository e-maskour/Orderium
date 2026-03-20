# ==================================
# Production-Grade NestJS API Dockerfile (Optimized)
# ==================================
# Key optimizations:
#   • Playwright base + browser install cached in early layers
#   • package.json + lockfile copied BEFORE source (cache pnpm install)
#   • Dev stage skips full COPY — source is volume-mounted
#   • Prod stage uses multi-stage for minimal image size

# ==================================
# Base image with system dependencies for Playwright
# ==================================
FROM node:20-bookworm-slim AS playwright-base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates fonts-liberation fonts-noto \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils && \
    rm -rf /var/lib/apt/lists/*

# ==================================
# Browser installer — cached unless playwright version changes
# ==================================
FROM playwright-base AS browser-installer

RUN corepack enable && corepack prepare pnpm@latest --activate

# Only copy what determines the playwright version
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm exec playwright install chromium

# ==================================
# Development Stage (optimized for speed)
# ==================================
# Key: only package files trigger pnpm install rebuild.
# Source code is volume-mounted in docker-compose, so we
# only COPY it as a fallback (when running without compose).
# ==================================
FROM playwright-base AS development

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=development

COPY --from=browser-installer /ms-playwright /ms-playwright

RUN corepack enable && corepack prepare pnpm@latest --activate

# 1. Copy ONLY package files — this layer is cached until deps change
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Copy source AFTER install (cache-friendly order)
#    In dev, docker-compose mounts ./api/src over /app/src anyway
COPY . .

EXPOSE 3000 9229
CMD ["pnpm", "run", "start:dev"]

# ==================================
# Builder Stage (production build)
# ==================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# ==================================
# Dependencies Stage (prod-only modules)
# ==================================
FROM node:20-bookworm-slim AS dependencies

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ==================================
# Production Stage
# ==================================
FROM playwright-base AS production

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=browser-installer /ms-playwright /ms-playwright

RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

WORKDIR /app

COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml ./

RUN mkdir -p uploads/images && \
    chown -R nestjs:nodejs uploads && \
    chown -R nestjs:nodejs /ms-playwright

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]