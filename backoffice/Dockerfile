# ==================================
# Production-Grade React/Vite Dockerfile (Backoffice) — Optimized
# ==================================
# Dev optimization: package files copied first for max cache hits.
# Source is volume-mounted via docker-compose, so dev rebuilds are instant.

# ============ Stage 1: Development ============
FROM node:20-alpine AS development

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy shared UI package
COPY shared/ui /shared/ui

# 1. Copy ONLY package files — cached until deps change
COPY backoffice/package.json backoffice/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Copy source AFTER install (fallback if not volume-mounted)
COPY backoffice/ .

EXPOSE 3001
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============ Stage 2: Dependencies (prod) ============
FROM node:20-alpine AS dependencies

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY shared/ui /shared/ui
COPY backoffice/package.json backoffice/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============ Stage 3: Build ============
FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY shared/ui /shared/ui
COPY --from=dependencies /app/node_modules ./node_modules
COPY backoffice/ .

ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_VAPID_KEY

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
ENV VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}
ENV VITE_FIREBASE_VAPID_KEY=${VITE_FIREBASE_VAPID_KEY}

RUN pnpm run build

# ============ Stage 4: Production with Nginx ============
FROM nginx:1.25-alpine AS production

COPY backoffice/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN addgroup -g 1001 -S nginx-run && \
  adduser -S nginx-run -u 1001 && \
  chown -R nginx-run:nginx-run /usr/share/nginx/html && \
  chown -R nginx-run:nginx-run /var/cache/nginx && \
  chown -R nginx-run:nginx-run /var/log/nginx && \
  touch /var/run/nginx.pid && \
  chown nginx-run:nginx-run /var/run/nginx.pid

USER nginx-run
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]