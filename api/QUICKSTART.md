# 🚀 Quick Start Guide - Orderium NestJS API

Get the Orderium API running in under 5 minutes!

## Prerequisites ✓

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

## Option 1: Automated Setup (Recommended)

```bash
cd api
./setup.sh
```

The script will:
1. Check dependencies
2. Install packages
3. Set up .env file
4. Create database
5. Run migrations

Then just:
```bash
npm run start:dev
```

## Option 2: Manual Setup

### Step 1: Install Dependencies

```bash
cd api
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=orderium_db
JWT_SECRET=your-secret-key
```

### Step 3: Create Database

```bash
createdb orderium_db
# or
psql -U postgres -c "CREATE DATABASE orderium_db;"
```

### Step 4: Run Migrations

```bash
npm run migration:run
```

### Step 5: Start Server

```bash
npm run start:dev
```

## Verify Installation

### Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-14T10:00:00.000Z"
}
```

### Test Products Endpoint

```bash
curl http://localhost:3000/api/products
```

Expected response:
```json
{
  "success": true,
  "products": [],
  "total": 0,
  "limit": 100,
  "offset": 0
}
```

### Test WebSocket Connection

Using a WebSocket client or browser console:
```javascript
const socket = io('http://localhost:3000');
socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

## Available Scripts

```bash
# Development
npm run start:dev       # Start with hot reload
npm run start:debug     # Start in debug mode

# Production
npm run build           # Build the application
npm run start:prod      # Start production server

# Database
npm run migration:run   # Run migrations
npm run migration:revert # Revert last migration

# Code Quality
npm run lint            # Lint code
npm run format          # Format code
npm run test            # Run tests
```

## Default Ports

- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000

## Common Issues

### Port Already in Use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Or start it
brew services start postgresql@14  # macOS
sudo systemctl start postgresql     # Linux
```

### Migration Failed

```bash
# Drop and recreate database
npm run schema:drop
npm run migration:run
```

## What's Next?

1. ✅ Read the full [README.md](README.md)
2. ✅ Check [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) for details
3. ✅ Review [API_COMPARISON.md](../API_COMPARISON.md)
4. ⬜ Start developing your features!
5. ⬜ Add tests
6. ⬜ Deploy to production

## API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/customers` | List customers |
| POST | `/api/orders` | Create order |
| GET | `/api/invoices` | List invoices |
| GET | `/api/delivery/persons` | List delivery persons |
| GET | `/api/notifications/user/:userId` | Get user notifications |
| GET | `/api/statistics/orders` | Order statistics |
| POST | `/api/portal/login` | Admin login |

## Need Help?

- 📖 Check the [README.md](README.md)
- 📋 Review [MIGRATION_COMPLETE.md](../MIGRATION_COMPLETE.md)
- 🔍 Read NestJS docs: https://docs.nestjs.com/
- 💬 Ask the development team

---

**Happy coding! 🎉**
