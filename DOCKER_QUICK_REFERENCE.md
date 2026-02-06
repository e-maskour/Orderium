# 🐳 Docker Quick Reference - Orderium Platform

## 🚀 Quick Start (One-Command Setup)

```bash
./docker-quick-start.sh prod  # Production mode
./docker-quick-start.sh dev   # Development mode
```

---

## 📦 Essential Commands

### First-Time Setup
```bash
# 1. Create environment file
cp .env.docker .env

# 2. Edit with your values
nano .env

# 3. Build and start
docker-compose up -d --build
```

### Daily Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose stop

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api

# Restart a service
docker-compose restart api

# Rebuild after code changes
docker-compose up -d --build api
```

### Database Operations
```bash
# Run migrations
docker-compose exec api npm run migration:run

# Seed database
docker-compose exec api npm run seed

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d orderium_db

# Backup database
docker-compose exec postgres pg_dump -U postgres orderium_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres orderium_db < backup.sql
```

### Debugging
```bash
# Check service status
docker-compose ps

# Check health status
docker inspect --format='{{.State.Health.Status}}' orderium-api

# Enter container shell
docker-compose exec api sh

# View resource usage
docker stats

# Full cleanup (WARNING: deletes data!)
docker-compose down -v
```

---

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://localhost:3000 | Backend REST API |
| Backoffice | http://localhost:3001 | Admin panel |
| Client Portal | http://localhost:3002 | Customer interface |
| Delivery Portal | http://localhost:3003 | Driver interface |
| PostgreSQL | localhost:5432 | Database |

---

## 🔧 Development Mode

```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

---

## 📊 Health Checks

```bash
# API health
curl http://localhost:3000/api/health

# Check all containers
docker-compose ps

# Detailed health status
docker inspect orderium-api | grep -A 10 Health
```

---

## 🛠️ Troubleshooting

### Ports Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
lsof -ti:3000 | xargs kill -9
```

### Container Won't Start
```bash
# View full logs
docker-compose logs api

# Remove and recreate
docker-compose rm -f api
docker-compose up -d api
```

### Database Connection Issues
```bash
# Check postgres health
docker inspect orderium-postgres | grep -A 5 Health

# Restart postgres
docker-compose restart postgres

# Check connection from API
docker-compose exec api sh
# Then inside container:
nc -zv postgres 5432
```

### Build Cache Issues
```bash
# Rebuild without cache
docker-compose build --no-cache

# Remove all images and rebuild
docker-compose down --rmi all
docker-compose up -d --build
```

---

## 🧹 Cleanup

```bash
# Stop containers (keep data)
docker-compose down

# Remove containers + volumes (DELETE DATA!)
docker-compose down -v

# Remove containers + images
docker-compose down --rmi all

# Full system cleanup
docker system prune -a --volumes
```

---

## 📂 File Structure Reference

```
Orderium/
├── api/
│   ├── Dockerfile           # Multi-stage NestJS build
│   └── .dockerignore
├── backoffice/
│   ├── Dockerfile           # React + Nginx
│   └── nginx.conf
├── client/
│   ├── Dockerfile
│   └── nginx.conf
├── delivery-portal/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Development overrides
├── .env                     # Your secrets (DO NOT COMMIT)
└── .env.docker              # Template
```

---

## ⚙️ Environment Variables (.env)

### Required
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=minimum_32_character_secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Optional
```env
NODE_ENV=production
VITE_API_BASE_URL=http://localhost:3000
STORAGE_PROVIDER=LOCAL
```

---

## 🔒 Security Checklist

- [ ] Changed default `DB_PASSWORD`
- [ ] Generated secure `JWT_SECRET` (32+ chars)
- [ ] Added Firebase credentials
- [ ] `.env` file in `.gitignore`
- [ ] Using non-root users in containers
- [ ] Health checks configured
- [ ] Nginx security headers enabled

---

## 📈 Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network traffic
docker network inspect orderium-network

# Volume usage
docker volume ls
docker volume inspect orderium_postgres_data
```

---

## 🚨 Emergency Commands

```bash
# Kill all containers
docker kill $(docker ps -q)

# Remove all containers
docker rm $(docker ps -a -q)

# Remove all volumes (DANGER!)
docker volume rm $(docker volume ls -q)

# Full nuclear reset
docker system prune -a --volumes -f
```

---

**📖 Full Guide**: See `DOCKER_GUIDE.md` for comprehensive documentation

**🆘 Support**: Check logs with `docker-compose logs -f` for troubleshooting
