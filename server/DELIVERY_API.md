# Delivery API Endpoints

## Authentication
- **POST** `/api/delivery/login` - Delivery person login
  - Body: `{ PhoneNumber, Password }`
  - Response: `{ success, deliveryPerson, token }`

## Delivery Portal Endpoints
- **GET** `/api/delivery/orders?deliveryPersonId=<id>` - Get assigned orders
  - Query: `deliveryPersonId` (required)
  - Response: `{ success, orders: [] }`

- **PUT** `/api/delivery/orders/:id/status?deliveryPersonId=<id>` - Update order status
  - Query: `deliveryPersonId` (required)
  - Body: `{ Status: 'assigned' | 'in_delivery' | 'delivered' }`
  - Response: `{ success, message }`

## Admin Endpoints (for backoffice)
- **POST** `/api/delivery` - Create delivery person
  - Body: `{ Name, PhoneNumber, Email?, Password }`
  - Response: `{ success, deliveryPerson }`

- **GET** `/api/delivery` - Get all delivery persons
  - Response: `{ success, deliveryPersons: [] }`

- **GET** `/api/delivery/:id` - Get delivery person by ID
  - Response: `{ success, deliveryPerson }`

- **PUT** `/api/delivery/:id` - Update delivery person
  - Body: `{ Name?, Email?, IsActive? }`
  - Response: `{ success, deliveryPerson }`

- **DELETE** `/api/delivery/:id` - Delete delivery person
  - Response: `{ success, message }`

- **POST** `/api/delivery/assign` - Assign order to delivery person
  - Body: `{ OrderId, DeliveryPersonId }`
  - Response: `{ success, message }`

- **POST** `/api/delivery/unassign/:orderId` - Unassign order
  - Response: `{ success, message }`

## Database Changes
The server automatically creates:
- `DeliveryPersons` table with columns:
  - DeliveryPersonId (PK)
  - Name
  - PhoneNumber (unique)
  - Email
  - IsActive
  - DateCreated
  - DateUpdated

- Adds to `Documents` table:
  - DeliveryPersonId (FK to DeliveryPersons)
  - DeliveryStatus ('assigned' | 'in_delivery' | 'delivered')

## Features
✅ Complete CRUD for delivery persons
✅ Order assignment/unassignment to delivery persons
✅ Delivery person authentication via Portal
✅ Order status tracking (assigned → in_delivery → delivered)
✅ Customer details included (name, phone, address, coordinates)
✅ Google Maps & Waze URLs for navigation
✅ Auto-initialization of database tables on startup
