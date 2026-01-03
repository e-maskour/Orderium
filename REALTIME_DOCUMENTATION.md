# Real-Time Order System Documentation

## Overview
The system uses Socket.io for bidirectional real-time communication between server and all three portals (Client, Delivery, Admin).

## Architecture

### Server-Side
- **Socket.io Server**: Located in `/server/src/socket/socket.ts`
- **Authentication Middleware**: `/server/src/socket/middleware/socketAuth.ts`
- **Room Management**: `/server/src/socket/rooms.ts`
- **Event Emitters**: `/server/src/socket/events/orderEvents.ts`

### Client-Side (All Portals)
Each portal has:
- `useSocket.ts` - Base socket connection hook
- `useOrderNotifications.ts` - High-level hook with toast notifications

## Room-Based Architecture

Users are automatically joined to rooms based on their type:

- **Admin**: `admin` room (receives ALL events)
- **Delivery Person**: `delivery-{deliveryPersonId}` room (only their orders)
- **Customer**: `customer-{customerId}` room (only their orders)
- **Everyone**: `orders` room (for broadcasts)

## Events

### 1. `order:created`
Emitted when a new order is placed.
- **Recipients**: Admin, Customer who placed the order
- **Data**: `{ orderId, orderNumber, customerId, timestamp }`

### 2. `order:assigned`
Emitted when an order is assigned to a delivery person.
- **Recipients**: Admin, Delivery person, Customer
- **Data**: `{ orderId, orderNumber, customerId, deliveryPersonId, timestamp }`

### 3. `order:statusChanged`
Emitted when order status changes (to_delivery, in_delivery, delivered).
- **Recipients**: Admin, Delivery person (if assigned), Customer
- **Data**: `{ orderId, orderNumber, customerId, deliveryPersonId, status, timestamp }`

### 4. `order:cancelled`
Emitted when an order is cancelled.
- **Recipients**: Admin, Delivery person (if was assigned), Customer
- **Data**: `{ orderId, orderNumber, customerId, deliveryPersonId, timestamp }`

## Usage Examples

### Admin Backoffice

```typescript
import { useOrderNotifications } from '../hooks/useOrderNotifications';

function Dashboard() {
  const { admin } = useAuth();
  
  const { isConnected } = useOrderNotifications({
    token: admin?.Token,
    enabled: !!admin,
  });
  
  return (
    <div>
      {isConnected && <span>🟢 Live</span>}
      {/* Your dashboard content */}
    </div>
  );
}
```

### Delivery Portal

```typescript
import { useOrderNotifications } from '../hooks/useOrderNotifications';

function DeliveryDashboard() {
  const { deliveryPerson } = useAuth();
  
  const { isConnected } = useOrderNotifications({
    token: deliveryPerson?.token,
    deliveryPersonId: deliveryPerson?.Id,
    enabled: !!deliveryPerson,
  });
  
  // Automatically receives toast notifications when:
  // - New order is assigned
  // - Order status changes
  // - Order is cancelled
  
  return <div>{/* Your content */}</div>;
}
```

### Client Portal

```typescript
import { useOrderNotifications } from '../hooks/useOrderNotifications';

function CustomerOrders() {
  const { customer } = useAuth();
  
  const { isConnected } = useOrderNotifications({
    token: customer?.token,
    customerId: customer?.Id,
    enabled: !!customer,
  });
  
  // Automatically receives toast notifications when:
  // - Order is created
  // - Delivery person is assigned
  // - Order status changes
  // - Order is cancelled
  
  return <div>{/* Your content */}</div>;
}
```

## React Query Integration

The notification hooks automatically invalidate React Query caches:

```typescript
// When an event is received:
queryClient.invalidateQueries({ queryKey: ['orders'] });
queryClient.invalidateQueries({ queryKey: ['order', orderId] });
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
```

This ensures the UI updates immediately without manual refetching.

## Authentication

Each portal must provide:

**Admin:**
```typescript
{
  token: string,
  userType: 'admin'
}
```

**Delivery:**
```typescript
{
  token: string,
  userType: 'delivery',
  deliveryPersonId: number
}
```

**Customer:**
```typescript
{
  token: string,
  userType: 'customer',
  customerId: number
}
```

## Security Notes

⚠️ **Important**: The current implementation includes a TODO for JWT verification:

```typescript
// TODO: Verify JWT token in production
// For now, we're just checking if token exists
```

**Before production:**
1. Implement JWT verification in `socketAuth.ts`
2. Validate user permissions
3. Add rate limiting for socket connections
4. Enable SSL/TLS (wss:// instead of ws://)

## Notification Sounds (Optional)

To add notification sounds:

1. Add an audio file to `/public/notification.mp3` in each portal
2. The hooks already include code to play it:

```typescript
const audio = new Audio('/notification.mp3');
audio.play().catch(() => console.log('Could not play sound'));
```

## Testing

1. **Start the server**: `cd server && npm run dev`
2. **Open Admin panel**: http://localhost:3002
3. **Open Delivery portal**: http://localhost:3003  
4. **Open Client portal**: http://localhost:3001
5. **Assign an order** → Delivery portal should receive notification
6. **Update order status** → Customer should receive notification
7. **Check admin panel** → Should receive all notifications

## Troubleshooting

### Connection Issues
- Check that server is running on port 3000
- Verify CORS origins in `socket.ts` match your portal URLs
- Ensure token is being passed correctly in auth handshake

### Not Receiving Events
- Verify user is logged in (token exists)
- Check browser console for socket connection errors
- Ensure user IDs (deliveryPersonId/customerId) are correct
- Check server logs for room join confirmations

### React Query Not Updating
- Ensure query keys match between queries and invalidation
- Check that `queryClient` is available (wrapped in QueryClientProvider)
- Verify React Query DevTools to see cache updates

## Performance Considerations

- Socket connections are persistent (not closed on navigation)
- Rooms are memory-efficient (Socket.io manages them internally)
- Events are targeted (not broadcast to all users)
- React Query prevents unnecessary API calls
