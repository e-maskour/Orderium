# syntax=docker/dockerfile:1
# ==================================
# Production-Grade React/Vite Dockerfile (Tenant Dashboard)
# ==================================
# Optimizations:
#   - BuildKit cache mounts: pnpm store persists between deploys
#   - Pinned pnpm@10.5.2: reproducible builds

# ============ Stage 1: Build ============
FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm-tenant-dashboard,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm run build

# ============ Stage 2: Production with Nginx ============
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

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
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
