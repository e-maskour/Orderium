# Orderium Project Structure

This project consists of three main applications:

## 1. Client (Customer Portal)
**Port**: 3001
**Location**: `/client`

Customer-facing application for browsing products and placing orders.

### Setup:
```bash
cd client
bun install
bun run dev
```

---

## 2. Backoffice (Admin Panel)
**Port**: 3002
**Location**: `/backoffice`

Admin panel for managing delivery persons and assigning orders.

### Setup:
```bash
cd backoffice
bun install
bun run dev
```

### Default Credentials:
- Username: `admin`
- Password: `admin123`

### Features:
- Manage delivery persons (CRUD)
- View all orders
- Assign orders to delivery persons
- Track delivery status

---

## 3. Delivery Portal
**Port**: 3003
**Location**: `/delivery-portal`

Portal for delivery persons to view and manage their assigned orders.

### Setup:
```bash
cd delivery-portal
bun install
bun run dev
```

### Features:
- Login with delivery person credentials
- View assigned orders
- Access customer address and contact info
- Navigate using Google Maps or Waze links
- Update delivery status (In Delivery → Delivered)

---

## Server (Backend API)
**Port**: 5000
**Location**: `/server`

Express.js API server with PostgreSQL database.

### Setup:
```bash
cd server
npm install
npm run dev
```

---

## Database Schema Updates

The following tables need to be added to support the delivery system:

### 1. Admins Table
```sql
CREATE TABLE Admins (
    AdminId SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin
INSERT INTO Admins (Username, Email, Password) 
VALUES ('admin', 'admin@orderium.ma', '$2b$10$hashedpassword');
```

### 2. DeliveryPersons Table
```sql
CREATE TABLE DeliveryPersons (
    DeliveryPersonId SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    PhoneNumber VARCHAR(20) UNIQUE NOT NULL,
    Email VARCHAR(100),
    Password VARCHAR(255) NOT NULL,
    IsActive BOOLEAN DEFAULT true,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP
);
```

### 3. Update Orders Table
```sql
ALTER TABLE Orders
ADD COLUMN DeliveryPersonId INT REFERENCES DeliveryPersons(DeliveryPersonId),
ADD COLUMN Status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN AssignedAt TIMESTAMP,
ADD COLUMN DeliveredAt TIMESTAMP;

-- Status values: 'pending', 'assigned', 'in_delivery', 'delivered', 'cancelled'
```

---

## API Endpoints

### Admin Authentication
- `POST /api/admin/login` - Admin login

### Delivery Persons (Admin only)
- `GET /api/delivery-persons` - List all delivery persons
- `POST /api/delivery-persons` - Create delivery person
- `GET /api/delivery-persons/:id` - Get delivery person
- `PUT /api/delivery-persons/:id` - Update delivery person
- `DELETE /api/delivery-persons/:id` - Delete delivery person

### Delivery Authentication
- `POST /api/delivery/login` - Delivery person login

### Delivery Orders
- `GET /api/delivery/orders` - Get assigned orders (requires auth)
- `PUT /api/delivery/orders/:id/status` - Update order status

### Order Assignment (Admin only)
- `POST /api/orders/:id/assign` - Assign order to delivery person
- `GET /api/orders` - Get all orders with delivery info

---

## Development Workflow

1. **Start the server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start the client** (in new terminal):
   ```bash
   cd client
   bun run dev
   ```

3. **Start the backoffice** (in new terminal):
   ```bash
   cd backoffice
   bun run dev
   ```

4. **Start the delivery portal** (in new terminal):
   ```bash
   cd delivery-portal
   bun run dev
   ```

---

## Access URLs

- **Client**: http://localhost:3001
- **Backoffice**: http://localhost:3002
- **Delivery Portal**: http://localhost:3003
- **API Server**: http://localhost:5000

---

## User Flow

### Admin Flow:
1. Login to backoffice
2. Create delivery persons
3. View orders from customers
4. Assign orders to available delivery persons

### Delivery Person Flow:
1. Login to delivery portal
2. View assigned orders
3. See customer details and address
4. Use Google Maps/Waze for navigation
5. Update status to "In Delivery" when starting
6. Update status to "Delivered" when complete

### Customer Flow:
1. Browse products on client app
2. Add items to cart
3. Checkout with address (auto-detected)
4. Order is created with map links
5. Receive delivery from assigned person

---

## Next Steps

To complete the setup:

1. **Server-side implementation**:
   - Add admin authentication routes
   - Add delivery person CRUD routes
   - Add delivery authentication routes
   - Add order assignment logic
   - Update order status endpoints

2. **Database**:
   - Run the SQL migrations to create new tables
   - Update the Orders table structure

3. **Install dependencies**:
   - Run `bun install` in backoffice and delivery-portal folders
   - Install additional packages if needed

4. **Configure environment variables**:
   - Update `.env` files with proper configurations
