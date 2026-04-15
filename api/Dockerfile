# syntax=docker/dockerfile:1
# ==================================
# Production-Grade NestJS API Dockerfile
# ==================================
# Optimizations:
#   - BuildKit cache mounts: pnpm store persists on the host between deploys,
#     surviving even --no-cache layer rebuilds (biggest time saver)
#   - Single builder stage: one pnpm install instead of three
#   - Playwright browsers installed before source copy -> cached until lockfile changes
#   - Pinned pnpm@10.5.2: reproducible builds, no surprise upgrades

# ==================================
# Base: system packages for Playwright (rarely changes -> stable cached layer)
# ==================================
FROM node:20-bookworm-slim AS playwright-base

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates fonts-liberation fonts-noto \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils && \
    rm -rf /var/lib/apt/lists/*

# ==================================
# Builder: one install -> playwright browsers -> compile -> prune
# Replaces the former browser-installer + builder + dependencies triple-install.
# ==================================
FROM playwright-base AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Lockfile first -- install layer only invalidates when dependencies change
COPY package.json pnpm-lock.yaml ./

# Cache mount: the pnpm content-addressable store lives on the host and is
# reused across every rebuild, even when Docker layer cache is fully bypassed.
RUN --mount=type=cache,id=pnpm-api,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Install Playwright browsers BEFORE copying source so this layer is cached
# independently of source changes (only re-runs when lockfile changes).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm exec playwright install chromium

# Copy and compile source
COPY . .
RUN pnpm run build

# Strip devDependencies for the production image
RUN pnpm prune --prod

# ==================================
# Development Stage
# ==================================
FROM playwright-base AS development

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-api-dev,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm exec playwright install chromium

# In dev, docker-compose mounts ./api/src; COPY is a fallback only.
COPY . .

EXPOSE 3000 9229
CMD ["pnpm", "run", "start:dev"]

# ==================================
# Production Stage
# ==================================
FROM playwright-base AS production

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

WORKDIR /app

# Copy pruned node_modules, compiled output, and browser binaries from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /ms-playwright /ms-playwright
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml ./

RUN mkdir -p uploads/images && \
    chown -R nestjs:nodejs uploads

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
