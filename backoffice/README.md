# Orderium Backoffice

Admin panel for managing delivery persons and assigning orders.

## Features

- **Authentication**: Secure admin login
- **Delivery Person Management**: Create, update, and delete delivery persons
- **Order Management**: View all orders and assign them to delivery persons
- **Real-time Updates**: React Query for automatic data synchronization

## Setup

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run dev
```

The backoffice will run on `http://localhost:3002`

## Default Admin Credentials

For testing, use:
- Username: `admin`
- Password: `admin123`

## Project Structure

```
backoffice/
├── src/
│   ├── components/      # Reusable components
│   ├── context/         # Auth context
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── index.html
├── package.json
└── vite.config.ts
```

## API Endpoints

The backoffice communicates with the following API endpoints:

- `POST /api/admin/login` - Admin authentication
- `GET /api/delivery-persons` - Get all delivery persons
- `POST /api/delivery-persons` - Create delivery person
- `PUT /api/delivery-persons/:id` - Update delivery person
- `DELETE /api/delivery-persons/:id` - Delete delivery person
- `GET /api/orders` - Get all orders
- `POST /api/orders/:id/assign` - Assign order to delivery person
