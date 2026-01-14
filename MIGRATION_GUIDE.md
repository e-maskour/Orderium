# Migration Guide: Express.js to NestJS

## Overview

This document provides a comprehensive guide for migrating from the old Express.js API to the new NestJS API.

## Key Changes

### 1. Database Migration: SQL Server → PostgreSQL

**Old**: Microsoft SQL Server
**New**: PostgreSQL

#### Migration Steps:

1. **Install PostgreSQL**:
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14

   # Ubuntu
   sudo apt-get install postgresql-14
   sudo systemctl start postgresql
   ```

2. **Create Database**:
   ```bash
   createdb orderium_db
   ```

3. **Export Data from SQL Server** (if needed):
   - Use SQL Server Management Studio or Azure Data Studio
   - Export tables to CSV or JSON
   - Import into PostgreSQL using `COPY` command or custom scripts

4. **Run Migrations**:
   ```bash
   cd api
   npm run migration:run
   ```

### 2. API Architecture Changes

#### Modules

**Old Structure** (Express):
```
server/src/modules/
├── products/
│   ├── product.model.ts
│   ├── product.repo.ts
│   ├── product.routes.ts
│   ├── product.service.ts
│   └── product.validators.ts
```

**New Structure** (NestJS):
```
api/src/modules/
├── products/
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   └── product-response.dto.ts
│   ├── entities/
│   │   └── product.entity.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
```

#### Validation

**Old** (Zod):
```typescript
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
});
```

**New** (class-validator):
```typescript
import { IsString, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}
```

#### Controllers

**Old** (Express):
```typescript
router.get('/', async (req, res) => {
  const products = await productService.findAll();
  res.json({ success: true, products });
});
```

**New** (NestJS):
```typescript
@Get()
async findAll() {
  const products = await this.productsService.findAll();
  return { success: true, products };
}
```

### 3. Database Access

**Old** (mssql):
```typescript
const pool = await getPool();
const result = await pool.request()
  .input('id', sql.Int, id)
  .query('SELECT * FROM Product WHERE Id = @id');
```

**New** (TypeORM):
```typescript
const product = await this.productRepository.findOne({
  where: { id }
});
```

### 4. Configuration

**Old** (.env with manual parsing):
```typescript
export const env = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: must("DB_HOST"),
  },
};
```

**New** (NestJS ConfigModule):
```typescript
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
}));
```

### 5. Socket.io Integration

**Old**:
```typescript
const io = new SocketIOServer(httpServer, { ... });
io.on('connection', (socket) => { ... });
```

**New**:
```typescript
@WebSocketGateway({ cors: { ... } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) { ... }
}
```

## API Endpoint Mapping

All endpoints remain backward compatible:

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| GET /api/products | GET /api/products | ✅ Same |
| POST /api/orders | POST /api/orders | ✅ Same |
| GET /health | GET /health | ✅ Same |

## Response Format

Response format remains consistent:

```json
{
  "success": true,
  "products": [...],
  "count": 10
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2024-01-14T10:00:00.000Z",
  "path": "/api/products/999",
  "error": "Product with ID 999 not found"
}
```

## Testing the Migration

### 1. Start Both Servers

**Old Server**:
```bash
cd server
npm run dev
# Runs on port 3000
```

**New Server**:
```bash
cd api
npm run start:dev
# Runs on port 3000 (or configure different port)
```

### 2. Compare Responses

Test the same endpoint on both:

```bash
# Old API
curl http://localhost:3000/api/products

# New API
curl http://localhost:3000/api/products
```

### 3. Verify Data Integrity

- Check that all records are migrated
- Verify relationships (foreign keys)
- Test CRUD operations

## Deployment Strategy

### Option 1: Blue-Green Deployment

1. Deploy new API to new server
2. Run both APIs in parallel
3. Gradually migrate traffic
4. Monitor for issues
5. Decommission old API

### Option 2: Big Bang Migration

1. Schedule maintenance window
2. Export data from SQL Server
3. Import to PostgreSQL
4. Deploy new API
5. Update frontend configurations
6. Test thoroughly

## Rollback Plan

If issues occur:

1. **Keep old server running** during migration
2. **Database backup**: Backup PostgreSQL before final cutover
3. **Configuration**: Keep old .env files
4. **Frontend**: Update API URLs to point back to old server

## Performance Improvements

The new NestJS API offers:

1. **Better Connection Pooling**: TypeORM manages connections efficiently
2. **Query Optimization**: TypeORM query builder with proper indexes
3. **Caching**: Built-in caching support
4. **Async/Await**: Better async handling
5. **Dependency Injection**: Reduced memory footprint

## Security Enhancements

1. **Helmet.js**: Added security headers
2. **Validation**: Strict DTO validation
3. **Type Safety**: Full TypeScript coverage
4. **CORS**: Configured properly
5. **Rate Limiting**: Can be easily added

## Monitoring & Logging

**Old**:
- Pino logger with manual implementation

**New**:
- NestJS Logger (based on Pino)
- Request/response interceptor logging
- Structured error logging
- Health check endpoint

## Known Issues & Solutions

### Issue 1: Date Formatting Differences

**Problem**: SQL Server uses different date format than PostgreSQL

**Solution**: TypeORM handles this automatically

### Issue 2: ID Generation

**Problem**: SQL Server uses `IDENTITY`, PostgreSQL uses `SERIAL`

**Solution**: Migrations create proper sequences

### Issue 3: Case Sensitivity

**Problem**: PostgreSQL is case-sensitive for unquoted identifiers

**Solution**: Use consistent naming (lowercase with underscores)

## Next Steps

1. ✅ Set up PostgreSQL database
2. ✅ Install dependencies
3. ✅ Configure environment variables
4. ✅ Run migrations
5. ✅ Test API endpoints
6. ⬜ Migrate data (if needed)
7. ⬜ Update frontend to use new API
8. ⬜ Deploy to production
9. ⬜ Monitor and optimize

## Support

For questions or issues during migration:

1. Check this guide
2. Review NestJS documentation
3. Check TypeORM documentation
4. Contact the development team

---

**Good luck with the migration! 🚀**
