# Morocom API - NestJS Edition

A professional, scalable NestJS API for the Morocom platform, featuring PostgreSQL, TypeORM, Socket.io, and comprehensive validation.

## 🚀 Features

- **Modern Architecture**: Built with NestJS following best practices
- **Database**: PostgreSQL with TypeORM for robust data management
- **Real-time**: Socket.io integration for live updates
- **Validation**: class-validator and class-transformer for data integrity
- **Security**: Helmet, CORS, and JWT authentication
- **Type Safety**: Full TypeScript support
- **Migration System**: Versioned database migrations
- **Error Handling**: Global exception filters
- **Logging**: Request/response logging with interceptors

## 📋 Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=orderium_db
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3002,http://localhost:3003

# Defaults
DEFAULT_CASH_REGISTER_ID=1
DEFAULT_WAREHOUSE_ID=1
DEFAULT_DOCUMENT_TYPE_ID=2
DEFAULT_PAID_STATUS=2
```

### 3. Set Up Database

Create a PostgreSQL database:

```bash
createdb orderium_db
```

Or using psql:

```sql
CREATE DATABASE orderium_db;
```

### 4. Run Migrations

```bash
npm run migration:run
```

### 5. Seed Database (Optional)

Populate the database with initial configurations:

```bash
npm run seed
```

This will create default configurations for:
- **Taxes**: Standard (20%), Reduced (10%), Zero (0%)
- **Currencies**: MAD, EUR, USD
- **Payment Terms**: Immediate, Net 15, Net 30, Net 60

## 🏃 Running the Application

### Development Mode

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Production Mode

```bash
npm run build
npm run start:prod
```

## 📁 Project Structure

```
api/
├── src/
│   ├── common/              # Shared resources
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # Request/response interceptors
│   │   └── pipes/           # Validation pipes
│   ├── config/              # Configuration files
│   │   ├── env.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── defaults.config.ts
│   ├── database/            # Database setup
│   │   ├── data-source.ts
│   │   └── migrations/
│   ├── gateway/             # WebSocket gateway
│   │   ├── events.gateway.ts
│   │   └── gateway.module.ts
│   ├── modules/             # Feature modules
│   │   ├── products/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── products.module.ts
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── invoices/
│   │   ├── delivery/
│   │   ├── portal/
│   │   ├── notifications/
│   │   └── statistics/
│   ├── app.module.ts
│   └── main.ts
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Check API and database status

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Soft delete customer

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/number/:orderNumber` - Get order by number
- `GET /api/orders/customer/:customerId` - Get customer orders
- `POST /api/orders` - Create new order

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice by ID

### Delivery
- `GET /api/delivery/persons` - List delivery persons
- `GET /api/delivery/orders` - List delivery orders
- `GET /api/delivery/person/:id/orders` - Get person's deliveries

### Notifications
- `GET /api/notifications/user/:userId` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/user/:userId/read-all` - Mark all as read

### Statistics
- `GET /api/statistics/orders` - Get order statistics
- `GET /api/statistics/daily` - Get daily statistics

### Configurations
- `GET /api/configurations` - List all configurations
- `GET /api/configurations/:id` - Get configuration by ID
- `GET /api/configurations/entity/:entity` - Get by entity name
- `POST /api/configurations` - Create configuration
- `PUT /api/configurations/:id` - Update configuration
- `DELETE /api/configurations/:id` - Delete configuration

### Portal
- `POST /api/portal/login` - Admin login

## 🔄 WebSocket Events

### Client → Server
- `join-room` - Join a specific room
- `leave-room` - Leave a room

### Server → Client
- `connected` - Connection confirmation
- `order:created` - New order notification
- `order:status-updated` - Order status change
- `delivery:assigned` - Delivery assignment
- `notification` - User notification

## 🗄️ Database Migrations

### Create a New Migration

```bash
npm run migration:create -- src/database/migrations/MigrationName
```

### Generate Migration from Entities

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

### Run Migrations

```bash
npm run migration:run
```🌱 Database Seeders

### Run All Seeders

```bash
npm run seed
```

Seeders will:
- Check for existing data to prevent duplicates
- Create initial configurations (taxes, currencies, payment terms)
- Log each operation with status

### Creating New Seeders

1. Create a new seeder file in `src/database/seeders/`
2. Export an async function that accepts `DataSource`
3. Add the seeder to `src/database/seeders/index.ts`

Example:
```typescript
export async function seedYourData(dataSource: DataSource) {
  const repository = dataSource.getRepository(YourEntity);
  // Seed logic here
}
```

## 

### Revert Last Migration

```bash
npm run migration:revert
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | Database user | postgres |
| DB_PASSWORD | Database password | - |
| DB_NAME | Database name | orderium_db |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | JWT expiration | 7d |
| CORS_ORIGIN | Allowed origins | localhost:3001,... |

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start:prod
```

## 📊 Migration from Express

This API replaces the Express.js server with the following improvements:

1. **Architecture**: Modular NestJS structure vs. flat Express
2. **Database**: PostgreSQL with TypeORM vs. SQL Server with mssql
3. **Validation**: class-validator decorators vs. Zod schemas
4. **Type Safety**: Full TypeScript integration
5. **Error Handling**: Global filters and interceptors
6. **Documentation**: Built-in Swagger support
7. **Testing**: Jest integration with NestJS testing utilities
8. **Scalability**: Dependency injection and modular design

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d orderium_db
```

### Migration Issues

```bash
# Drop all tables (WARNING: destroys data)
npm run schema:drop

# Sync schema (not recommended for production)
npm run schema:sync
```

## 📚 Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Socket.io Documentation](https://socket.io/docs/)

## 🤝 Contributing

1. Follow NestJS best practices
2. Write tests for new features
3. Update documentation
4. Follow the existing code style

## 📄 License

UNLICENSED

## 👥 Support

For issues and questions, please refer to the project documentation or contact the development team.

---

**Built with ❤️ using NestJS**
