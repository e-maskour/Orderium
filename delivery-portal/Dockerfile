# ==================================
# Production-Grade React/Vite Dockerfile (Delivery Portal)
# ==================================

# ============ Stage 1: Dependencies ============
FROM node:20-alpine AS dependencies

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy shared UI package (file:../shared/ui resolves to /shared/ui from WORKDIR /app)
COPY shared/ui /shared/ui

# Copy package files a
COPY delivery-portal/package.json delivery-portal/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============ Stage 2: Build ============
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY shared/ui /shared/ui
RUN cd /shared/ui && pnpm install --frozen-lockfile
COPY --from=dependencies /app/node_modules ./node_modules
COPY delivery-portal/ .

# Build arguments for environment variables (can be overridden at build time)
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

# Build the application
RUN pnpm run build

# ============ Stage 3: Development ============
FROM node:20-alpine AS development

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy shared UI package (file:../shared/ui resolves to /shared/ui from WORKDIR /app)
COPY shared/ui /shared/ui

# Copy package files
COPY delivery-portal/package.json delivery-portal/pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY delivery-portal/ .

# Expose Vite dev server port
EXPOSE 3003

# Start Vite dev server
# --host 0.0.0.0 allows external access from Docker
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============ Stage 4: Production with Nginx ============
FROM nginx:1.25-alpine AS production

# Copy custom nginx configuration
COPY delivery-portal/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-run && \
  adduser -S nginx-run -u 1001 && \
  chown -R nginx-run:nginx-run /usr/share/nginx/html && \
  chown -R nginx-run:nginx-run /var/cache/nginx && \
  chown -R nginx-run:nginx-run /var/log/nginx && \
  touch /var/run/nginx.pid && \
  chown nginx-run:nginx-run /var/run/nginx.pid

# Switch to non-root user
USER nginx-run

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
