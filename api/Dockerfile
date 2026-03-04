# ==================================
# Production-Grade NestJS API Dockerfile (Optimized)
# ==================================

# ==================================
# Base image with Playwright installed ONCE
# ==================================
FROM node:20-bookworm-slim AS playwright-base

WORKDIR /app

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Playwright browsers once (cached layer)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

# ==================================
# Dependencies Stage
# ==================================
FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

# ==================================
# Builder Stage
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
# Development Stage
# ==================================
FROM playwright-base AS development

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000 9229
CMD ["pnpm", "run", "start:dev"]

# ==================================
# Production Stage
# ==================================
FROM playwright-base AS production

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy node_modules (prod only)
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml ./

# Create uploads directory
RUN mkdir -p uploads/images && \
    chown -R nestjs:nodejs uploads && \
    chown -R nestjs:nodejs /ms-playwright

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]