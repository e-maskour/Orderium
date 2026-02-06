# ==================================
# Production-Grade NestJS API Dockerfile
# ==================================

# ============ Stage 1: Dependencies ============
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
# --omit=dev skips devDependencies, --prefer-offline speeds up builds
RUN npm ci --omit=dev --prefer-offline

# ============ Stage 2: Build ============
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) for building
RUN npm ci --prefer-offline

# Copy source code
COPY . .

# Build the application
# NestJS compiles TypeScript to JavaScript in dist/
RUN npm run build

# Remove devDependencies after build (reduces image size)
RUN npm prune --production

# ============ Stage 3: Development ============
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) for development
RUN npm ci --prefer-offline

# Copy source code
COPY . .

# Expose API port and debugger port
EXPOSE 3000 9229

# Start development server with hot reload
CMD ["npm", "run", "start:dev"]

# ============ Stage 4: Production ============
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json for metadata
COPY --chown=nestjs:nodejs package*.json ./

# Create uploads directory with proper permissions
RUN mkdir -p uploads/images && \
    chown -R nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
