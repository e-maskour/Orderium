# 🐳 Orderium Docker Deployment Guide

> **Senior DevOps Architecture Documentation**  
> Production-grade containerization strategy for the Orderium multi-service platform

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Service Analysis](#service-analysis)
3. [Dockerfile Design Principles](#dockerfile-design-principles)
4. [Docker Compose Orchestration](#docker-compose-orchestration)
5. [Repository Structure](#repository-structure)
6. [Environment Configuration](#environment-configuration)
7. [Build & Deployment Commands](#build--deployment-commands)
8. [Health Checks & Dependencies](#health-checks--dependencies)
9. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
10. [Production Considerations](#production-considerations)
11. [Final Run Checklist](#final-run-checklist)

---

## 🏗️ Architecture Overview

### Platform Components

The Orderium platform consists of **5 containerized services**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Orderium Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Backoffice  │  │    Client    │  │   Delivery   │      │
│  │   (3001)     │  │   Portal     │  │   Portal     │      │
│  │  React/Vite  │  │   (3002)     │  │   (3003)     │      │
│  │   + Nginx    │  │ React/Vite   │  │  React/Vite  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │     API     │                          │
│                    │   (3000)    │                          │
│                    │   NestJS    │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  PostgreSQL │                          │
│                    │   (5432)    │                          │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Network & Communication

- **Network**: `orderium-network` (bridge driver)
- **Inter-service communication**: Container names as DNS (e.g., `http://api:3000`)
- **External access**: Host port mapping (3000-3003, 5432)

---

## 🔍 Service Analysis

### 1. **PostgreSQL Database**
- **Role**: Primary data store for the entire platform
- **Image**: `postgres:16-alpine` (official, lightweight, LTS)
- **Persistence**: Named volume `postgres_data`
- **Health Check**: `pg_isready` command

### 2. **API (NestJS Backend)**
- **Role**: RESTful API server, business logic, authentication
- **Tech Stack**: Node.js 20 + NestJS + TypeORM
- **Build Strategy**: Multi-stage (dependencies → builder → production)
- **Security**: Runs as non-root user `nestjs:1001`
- **Persistence**: Volume for `/app/uploads` directory
- **Health Check**: HTTP GET to `/api/health`

### 3. **Backoffice (Admin Panel)**
- **Role**: Internal management interface for staff/admins
- **Tech Stack**: React 18 + Vite 5 + Tailwind CSS
- **Serving**: Nginx 1.25-alpine (production)
- **Build Output**: Static SPA in `/usr/share/nginx/html`
- **Security**: Non-root nginx user, security headers

### 4. **Client Portal**
- **Role**: Customer-facing order management interface
- **Tech Stack**: React 18 + Vite 5 + Tailwind CSS
- **Serving**: Nginx 1.25-alpine
- **Features**: PWA-enabled (manifest.json, service workers)

### 5. **Delivery Portal**
- **Role**: Delivery driver interface for order fulfillment
- **Tech Stack**: React 18 + Vite 5
- **Serving**: Nginx 1.25-alpine
- **Port**: Custom 3003 in development

---

## 🏭 Dockerfile Design Principles

### Multi-Stage Build Strategy

All Dockerfiles use **3-stage builds** for optimal caching and minimal final image size:

#### **Stage 1: Dependencies**
```dockerfile
FROM node:20-alpine AS dependencies
# Install ONLY production dependencies
# Cached layer - rebuilds only when package.json changes
```

#### **Stage 2: Builder**
```dockerfile
FROM node:20-alpine AS builder
# Install ALL dependencies (including dev)
# Build the application
# Prune dev dependencies after build
```

#### **Stage 3: Production**
```dockerfile
FROM node:20-alpine (API) OR nginx:1.25-alpine (Frontends)
# Copy ONLY built artifacts + production dependencies
# Run as non-root user
# Expose ports and define health checks
```

### Why This Approach?

✅ **Layer Caching**: Dependencies stage rebuilds only when `package.json` changes  
✅ **Size Optimization**: Final image excludes source code, devDependencies, build tools  
✅ **Security**: Non-root users, minimal attack surface, no unnecessary binaries  
✅ **Speed**: Parallel builds, optimized for CI/CD pipelines  

### Security Best Practices

1. **Non-Root Users**:
   - API: `nestjs:1001`
   - Frontends: `nginx-run:1001`

2. **Minimal Base Images**:
   - Alpine Linux (5MB vs 200MB+ for full images)
   - Official, maintained images only

3. **No Secrets in Images**:
   - Environment variables injected at runtime
   - No hardcoded credentials or API keys

4. **.dockerignore Files**:
   - Exclude `node_modules`, `.env`, `.git`, test files
   - Reduces build context size by 90%+

---

## 🎼 Docker Compose Orchestration

### Service Dependency Chain

```
postgres (db ready) 
    ↓
api (health check passes)
    ↓
backoffice + client + delivery-portal
```

### Key Design Decisions

#### 1. **Health Checks with Conditions**
```yaml
depends_on:
  postgres:
    condition: service_healthy  # Waits for pg_isready
```

**Why?** Prevents API from starting before database is ready, avoiding connection errors.

#### 2. **Restart Policies**
```yaml
restart: unless-stopped
```

**Why?** Survives server reboots, handles transient failures, but allows manual stops.

#### 3. **Named Volumes**
```yaml
volumes:
  postgres_data:
    name: orderium_postgres_data
  api_uploads:
    name: orderium_api_uploads
```

**Why?** Persistent data survives container recreation, explicit naming for clarity.

#### 4. **Custom Network**
```yaml
networks:
  orderium-network:
    driver: bridge
```

**Why?** Isolates platform services, enables DNS-based service discovery, allows future expansion.

#### 5. **Build Arguments**
```yaml
args:
  VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:3000}
```

**Why?** Frontend apps need API URL at build time (Vite replaces `import.meta.env.VITE_*` during build).

---

## 📁 Repository Structure

```
Orderium/
├── api/
│   ├── Dockerfile              # Multi-stage NestJS build
│   ├── .dockerignore           # Exclude node_modules, .env, etc.
│   ├── src/                    # Source code
│   └── package.json
│
├── backoffice/
│   ├── Dockerfile              # Multi-stage React + Nginx
│   ├── nginx.conf              # SPA routing, compression, headers
│   ├── .dockerignore
│   ├── src/
│   └── package.json
│
├── client/
│   ├── Dockerfile              # Multi-stage React + Nginx
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── src/
│   └── package.json
│
├── delivery-portal/
│   ├── Dockerfile              # Multi-stage React + Nginx
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── src/
│   └── package.json
│
├── docker-compose.yml          # Production orchestration
├── docker-compose.dev.yml      # Development overrides
├── .env.docker                 # Environment template
├── .env                        # Your actual values (gitignored)
├── .dockerignore               # Root-level exclusions
└── DOCKER_GUIDE.md             # This file
```

### File Responsibilities

| File | Purpose |
|------|---------|
| `Dockerfile` | Build instructions for each service |
| `.dockerignore` | Exclude files from build context (speeds up builds) |
| `nginx.conf` | Frontend serving: SPA routing, caching, compression |
| `docker-compose.yml` | Production-grade service orchestration |
| `docker-compose.dev.yml` | Development mode (hot reload, debugger ports) |
| `.env.docker` | Template for environment variables |
| `.env` | Your actual secrets (NEVER commit this) |

---

## 🔧 Environment Configuration

### Step 1: Create `.env` File

```bash
cp .env.docker .env
```

### Step 2: Update Critical Values

**Required:**
```env
# Database
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=minimum_32_character_random_string

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Optional (for production):**
```env
# Frontend API URL (use your domain in production)
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Environment Variable Flow

```
.env file (host) 
    ↓ (docker-compose reads)
docker-compose.yml environment section
    ↓ (injected into containers)
Application runtime (process.env or import.meta.env)
```

### Frontend Build-Time vs Runtime Variables

⚠️ **CRITICAL**: Vite frontends require `VITE_*` variables at **build time**, not runtime!

```yaml
# In docker-compose.yml
backoffice:
  build:
    args:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL}  # ← Build-time injection
```

During `npm run build`, Vite replaces `import.meta.env.VITE_API_BASE_URL` with the actual value in the JavaScript bundle.

---

## 🚀 Build & Deployment Commands

### Production Deployment

#### 1. **First-Time Setup**
```bash
# Navigate to project root
cd /Users/emaskour/Desktop/projects/Orderium

# Create environment file
cp .env.docker .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

#### 2. **Build All Services**
```bash
# Build images (uses caching for speed)
docker-compose build

# Build without cache (for clean builds)
docker-compose build --no-cache

# Build a specific service
docker-compose build api
```

#### 3. **Start the Platform**
```bash
# Start all services in detached mode (background)
docker-compose up -d

# Start with live logs
docker-compose up

# Start specific services
docker-compose up -d postgres api
```

#### 4. **Check Status**
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f           # All services
docker-compose logs -f api       # Specific service
docker-compose logs --tail=100 api  # Last 100 lines

# Check health status
docker inspect --format='{{.State.Health.Status}}' orderium-api
```

#### 5. **Stop & Cleanup**
```bash
# Stop containers (preserves data)
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove containers + volumes (DELETES DATA!)
docker-compose down -v

# Remove containers + images
docker-compose down --rmi all
```

### Development Mode

```bash
# Run development compose (hot reload enabled)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs for debugging
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

### Database Operations

#### Run Migrations
```bash
# Enter API container
docker-compose exec api sh

# Inside container
npm run migration:run
exit
```

#### Seed Database
```bash
docker-compose exec api npm run seed
```

#### Access PostgreSQL
```bash
# Using psql
docker-compose exec postgres psql -U postgres -d orderium_db

# Or from host (if postgres client installed)
psql -h localhost -p 5432 -U postgres -d orderium_db
```

#### Backup Database
```bash
# Create dump
docker-compose exec postgres pg_dump -U postgres orderium_db > backup.sql

# Restore dump
docker-compose exec -T postgres psql -U postgres orderium_db < backup.sql
```

### Rebuild After Code Changes

```bash
# Rebuild changed service(s)
docker-compose build api
docker-compose up -d api

# Or rebuild + restart in one command
docker-compose up -d --build api
```

---

## 🏥 Health Checks & Dependencies

### Health Check Implementation

#### **PostgreSQL**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d orderium_db"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

- **Test**: `pg_isready` checks if database accepts connections
- **Start Period**: 10s grace period for initialization
- **Retries**: 5 failed attempts before marking unhealthy

#### **API (NestJS)**
```yaml
healthcheck:
  test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

- **Test**: HTTP GET to `/api/health` endpoint
- **Start Period**: 40s (allows time for NestJS bootstrap + DB connection)
- **Exit Code**: 0 = healthy, 1 = unhealthy

#### **Frontends (Nginx)**
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 5s
```

- **Test**: `wget` checks if nginx serves index.html
- **Start Period**: 5s (nginx starts fast)

### Dependency Management

```yaml
api:
  depends_on:
    postgres:
      condition: service_healthy  # ← Waits for health check

backoffice:
  depends_on:
    api:
      condition: service_healthy  # ← Waits for API
```

**Start Order:**
1. PostgreSQL starts → health check passes
2. API starts → connects to DB → health check passes
3. Frontends start → can communicate with API

**Why This Matters:**
- Prevents "connection refused" errors
- Avoids race conditions
- Ensures deterministic startup sequence

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: No Multi-Stage Builds

**Bad:**
```dockerfile
FROM node:20
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/main.js"]
```

**Problems:**
- Includes `node_modules` with devDependencies (~500MB)
- Includes source code (not needed in production)
- No layer caching optimization

**Good:**
```dockerfile
FROM node:20-alpine AS dependencies
# ... (3-stage build)
```

**Why Better:**
- Final image: ~150MB vs ~800MB
- Faster builds (caching)
- Smaller attack surface

---

### ❌ Mistake 2: Running as Root

**Bad:**
```dockerfile
FROM node:20-alpine
# No USER command → runs as root (uid 0)
```

**Problems:**
- Container escape = root on host (security risk)
- File permission issues with volumes
- Fails security audits (PCI, SOC 2)

**Good:**
```dockerfile
RUN adduser -S nestjs -u 1001
USER nestjs  # ← Run as UID 1001
```

---

### ❌ Mistake 3: Missing Health Checks

**Bad:**
```yaml
api:
  depends_on:
    - postgres  # ← Only waits for container start, not readiness
```

**Problems:**
- API starts before postgres is ready
- Connection errors for 5-10 seconds
- Requires manual retry logic in app code

**Good:**
```yaml
api:
  depends_on:
    postgres:
      condition: service_healthy  # ← Waits for health check
```

---

### ❌ Mistake 4: Hardcoded Environment Variables

**Bad:**
```dockerfile
ENV DB_PASSWORD=postgres123
```

**Problems:**
- Secrets baked into image (visible in `docker history`)
- Can't change without rebuilding
- Security nightmare

**Good:**
```yaml
# docker-compose.yml
environment:
  DB_PASSWORD: ${DB_PASSWORD}  # ← From .env file
```

---

### ❌ Mistake 5: Ignoring .dockerignore

**Bad:**
```
# No .dockerignore file
```

**Problems:**
- Sends entire `node_modules/` to Docker daemon (500MB+)
- Sends `.git/` history (100MB+)
- Build takes 10x longer

**Good:**
```
# .dockerignore
node_modules
.git
.env
```

**Impact:**
- Build context: 500MB → 10MB
- Build time: 60s → 6s

---

### ❌ Mistake 6: Frontend API URL Confusion

**Bad:**
```yaml
backoffice:
  environment:
    VITE_API_BASE_URL: http://api:3000  # ← Won't work!
```

**Problems:**
- `http://api:3000` works **inside Docker network**, not in user's browser
- Browser tries to resolve `api` hostname (fails)

**Good:**
```yaml
backoffice:
  build:
    args:
      VITE_API_BASE_URL: http://localhost:3000  # ← Build-time injection
```

**Why:** Vite bundles API URL into JavaScript at **build time**. Browser connects directly to `localhost:3000` (host-mapped port).

---

### ❌ Mistake 7: No Volume for Data Persistence

**Bad:**
```yaml
postgres:
  # No volumes section
```

**Problems:**
- `docker-compose down` = all data deleted
- Database resets on every restart

**Good:**
```yaml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

---

## 🏢 Production Considerations

### Scaling & Orchestration

**Docker Compose Limitations:**
- Single-host only (no clustering)
- Manual scaling (`docker-compose up --scale api=3`)
- No auto-restart on different nodes

**Migrate to Kubernetes When:**
- Need multi-host deployment
- Require auto-scaling (CPU/memory-based)
- Need zero-downtime rolling updates
- Require built-in service discovery & load balancing

### Security Hardening

1. **SSL/TLS Termination**:
   - Add nginx reverse proxy for HTTPS
   - Use Let's Encrypt for certificates
   - Example: [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) + [acme-companion](https://github.com/nginx-proxy/acme-companion)

2. **Secrets Management**:
   - Use Docker Secrets (Swarm) or Kubernetes Secrets
   - Avoid `.env` files in production (use encrypted key vaults)

3. **Network Segmentation**:
   - Separate `frontend-network` and `backend-network`
   - Frontends shouldn't access database directly

4. **Image Scanning**:
   ```bash
   docker scan orderium-api:latest
   ```

### Monitoring & Logging

**Recommendations:**
- **Logs**: Centralized logging (ELK stack, Grafana Loki)
- **Metrics**: Prometheus + Grafana
- **APM**: Sentry, New Relic, or Datadog
- **Health Checks**: Uptime monitoring (UptimeRobot, Pingdom)

**Example:**
```yaml
# Add logging driver
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
# .github/workflows/deploy.yml
- name: Build and push images
  run: |
    docker-compose build
    docker tag orderium-api:latest registry.example.com/orderium-api:${{ github.sha }}
    docker push registry.example.com/orderium-api:${{ github.sha }}
```

### Backup Strategy

**Database:**
```bash
# Automated daily backups
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres orderium_db | gzip > /backups/orderium_$(date +\%Y\%m\%d).sql.gz
```

**Uploads:**
```bash
# S3 sync for api_uploads volume
docker run --rm -v orderium_api_uploads:/data -v ~/.aws:/root/.aws amazon/aws-cli s3 sync /data s3://bucket/uploads/
```

---

## ✅ Final Run Checklist

### Prerequisites

- [ ] Docker installed (version 24.0+)
- [ ] Docker Compose installed (version 2.20+)
- [ ] Ports available: 3000-3003, 5432
- [ ] Minimum 4GB RAM, 10GB disk space

### Initial Setup

```bash
# 1. Clone repository
cd /Users/emaskour/Desktop/projects/Orderium

# 2. Create environment file
cp .env.docker .env

# 3. Edit .env with production values
nano .env
# ← Update: DB_PASSWORD, JWT_SECRET, FIREBASE_* variables

# 4. Verify .env syntax
grep -v '^#' .env | grep -v '^$'
```

### Build & Start

```bash
# 5. Build all images (first time: 3-5 minutes)
docker-compose build

# 6. Start in detached mode
docker-compose up -d

# 7. Watch startup logs
docker-compose logs -f

# Wait for:
# ✓ "PostgreSQL ready to accept connections"
# ✓ "Server running on http://localhost:3000"
# ✓ All health checks passing
```

### Verification

```bash
# 8. Check all containers running
docker-compose ps
# Should show 5 services: postgres, api, backoffice, client, delivery-portal

# 9. Test API health endpoint
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# 10. Test frontends
curl -I http://localhost:3001  # Backoffice
curl -I http://localhost:3002  # Client
curl -I http://localhost:3003  # Delivery Portal
# All should return: HTTP/1.1 200 OK

# 11. Check database connection
docker-compose exec postgres psql -U postgres -d orderium_db -c "SELECT version();"
# Should show PostgreSQL version

# 12. Check health status
docker inspect --format='{{.State.Health.Status}}' orderium-postgres
docker inspect --format='{{.State.Health.Status}}' orderium-api
docker inspect --format='{{.State.Health.Status}}' orderium-backoffice
docker inspect --format='{{.State.Health.Status}}' orderium-client
docker inspect --format='{{.State.Health.Status}}' orderium-delivery
# All should show: healthy
```

### Database Initialization

```bash
# 13. Run migrations
docker-compose exec api npm run migration:run

# 14. (Optional) Seed initial data
docker-compose exec api npm run seed
```

### Access Applications

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://localhost:3000 | Backend REST API |
| Backoffice | http://localhost:3001 | Admin panel |
| Client Portal | http://localhost:3002 | Customer interface |
| Delivery Portal | http://localhost:3003 | Driver interface |
| PostgreSQL | localhost:5432 | Database (psql access) |

### Troubleshooting

```bash
# View logs for specific service
docker-compose logs -f api

# Restart unhealthy service
docker-compose restart api

# Rebuild after code changes
docker-compose up -d --build api

# Full reset (WARNING: deletes data)
docker-compose down -v
docker-compose up -d --build
```

### Shutdown

```bash
# Stop (preserves data)
docker-compose stop

# Stop and remove containers (preserves data)
docker-compose down

# Nuclear option (deletes volumes)
docker-compose down -v
```

---

## 📝 Summary

### Why This Setup Is Production-Ready

✅ **Multi-Stage Builds**: Minimal image sizes, optimized caching  
✅ **Security**: Non-root users, no hardcoded secrets, minimal attack surface  
✅ **Reliability**: Health checks, dependency management, restart policies  
✅ **Maintainability**: Clear structure, documented configuration, version control  
✅ **Performance**: Layer caching, nginx compression, PostgreSQL tuning  
✅ **Scalability**: Prepared for migration to Kubernetes, stateless frontends  

### Key Differences from Naive Approach

| Naive | Professional |
|-------|--------------|
| Single `FROM node:latest` | 3-stage multi-stage build |
| Runs as root | Non-root users (1001) |
| No health checks | Comprehensive health checks |
| `depends_on: [postgres]` | `condition: service_healthy` |
| Hardcoded values | Environment variables + `.env` |
| 800MB image | 150MB image |
| No caching | Optimized layer caching |
| Includes source code | Only artifacts + dependencies |

---

**🎉 Your Orderium platform is now fully containerized and ready for production deployment!**

For questions or issues, refer to:
- Docker docs: https://docs.docker.com
- Docker Compose docs: https://docs.docker.com/compose
- NestJS Docker guide: https://docs.nestjs.com/recipes/docker
- Nginx guide: https://nginx.org/en/docs/

---

*Last updated: February 6, 2026*  
*Architecture: Senior DevOps Team*
