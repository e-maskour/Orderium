# Push Notification System Architecture

## Overview

This document describes the complete push notification system for Orderium, enabling real-time system notifications across the Client Portal, Backoffice Portal, and Delivery Portal applications.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase Cloud Messaging                  │
│                         (Push Notification Hub)                  │
└─────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ Push via FCM
                                   │
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS Backend API                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ NotificationsModule │  │ OrdersModule  │  │ DeliveryModule │  │
│  │                     │  │               │  │                │  │
│  │ - PushNotification  │◄─┤ Creates Order │◄─┤ Assigns Order  │  │
│  │   Service           │  │ Trigger Rule 1│  │ Trigger Rule 2 │  │
│  │ - OrderNotification │  │               │  │ Updates Status │  │
│  │   Service           │  └───────────────┘  │ Trigger Rule 3 │  │
│  │ - DeviceToken       │                     └────────────────┘  │
│  │   Repository        │                                         │
│  └─────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ REST API
                                   │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  Client Portal  │  │  Backoffice     │  │  Delivery Portal    │
│  (React + Vite) │  │  (React + Vite) │  │  (React + Vite)     │
│                 │  │                 │  │                     │
│ - Firebase SW   │  │ - Firebase SW   │  │ - Firebase SW       │
│ - usePush Hook  │  │ - usePush Hook  │  │ - usePush Hook      │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

## Notification Rules

### Rule 1: New Order from Client → Admin
**Trigger:** When a client creates an order (`fromClient: true`)
**Recipients:** All admin users in the backoffice
**Notification:**
- Title: "🛒 Nouvelle commande"
- Body: "Commande #[ORDER_NUMBER] reçue de [CUSTOMER_NAME]"

### Rule 2: Order Assigned to Delivery → Customer + Delivery Person
**Trigger:** When admin assigns an order to a delivery person
**Recipients:** 
- Customer (Client Portal)
- Assigned delivery person (Delivery Portal)
**Notifications:**
- **Customer:** "📦 Commande assignée - Votre commande #X a été assignée à [DELIVERY_PERSON]"
- **Delivery:** "🚚 Nouvelle assignation - Commande #X vous a été assignée"

### Rule 3: Delivery Status Change → Customer
**Trigger:** When delivery status changes (by admin or delivery person)
**Recipients:** Customer who placed the order
**Notification:**
- Title: "[emoji] Mise à jour de livraison"
- Body: "Commande #[ORDER_NUMBER]: [STATUS_LABEL]"

## Database Schema

### device_tokens Table
```sql
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform device_platform_enum DEFAULT 'web',  -- 'web', 'android', 'ios'
  appType app_type_enum NOT NULL,               -- 'client', 'backoffice', 'delivery'
  deviceName VARCHAR(255),
  browserName VARCHAR(100),
  osName VARCHAR(100),
  isActive BOOLEAN DEFAULT true,
  lastUsedAt TIMESTAMP,
  dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dateUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IDX_device_tokens_userId ON device_tokens(userId);
CREATE INDEX IDX_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IDX_device_tokens_appType ON device_tokens(appType);
CREATE INDEX IDX_device_tokens_isActive ON device_tokens(isActive);
```

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Cloud Messaging

### 2. Generate VAPID Key
1. Go to Project Settings → Cloud Messaging
2. Under "Web Push certificates", generate a new key pair
3. Copy the public key (VAPID key)

### 3. Get Service Account Credentials
1. Go to Project Settings → Service Accounts
2. Generate new private key
3. Download the JSON file

### 4. Environment Variables

#### Backend (.env)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_VAPID_KEY=BLxxx...
```

## API Endpoints

### Register Device Token
```
POST /notifications/device-token/:userId
Body: {
  token: string,
  platform: 'web' | 'android' | 'ios',
  appType: 'client' | 'backoffice' | 'delivery',
  deviceName?: string,
  browserName?: string,
  osName?: string
}
```

### Unregister Device Token
```
DELETE /notifications/device-token
Body: { token: string }
```

### Get User Devices
```
GET /notifications/device-token/:userId
Response: { success: true, devices: DeviceToken[] }
```

### Refresh Token
```
PATCH /notifications/device-token/:token/refresh
```

## React Integration

### Using the Hook

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/context/AuthContext';

function App() {
  const { user } = useAuth();
  
  const { 
    isSupported,
    permission,
    isLoading,
    requestPermission,
    registerToken,
  } = usePushNotifications(user?.id, (payload) => {
    // Handle foreground notifications
    console.log('Notification received:', payload);
    // Show toast or update UI
  });

  useEffect(() => {
    // Auto-register when user logs in
    if (user?.id && permission === 'granted') {
      registerToken(user.id);
    }
  }, [user?.id, permission]);

  const enableNotifications = async () => {
    const granted = await requestPermission();
    if (granted && user?.id) {
      await registerToken(user.id);
    }
  };

  return (
    <div>
      {isSupported && permission !== 'granted' && (
        <button onClick={enableNotifications}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

### Notification Permission UI Component

```tsx
function NotificationPrompt() {
  const { isSupported, permission, requestPermission } = usePushNotifications();

  if (!isSupported) {
    return <p>Notifications not supported on this browser</p>;
  }

  if (permission === 'granted') {
    return <p>✓ Notifications enabled</p>;
  }

  if (permission === 'denied') {
    return <p>Notifications blocked. Please enable in browser settings.</p>;
  }

  return (
    <button onClick={requestPermission}>
      Enable Push Notifications
    </button>
  );
}
```

## Service Worker

The service worker (`firebase-messaging-sw.js`) handles:
- Background message reception
- Notification display
- Click handling
- Subscription management

Located in each app's `public/` folder.

## Best Practices

### Security
1. **Token Validation:** Validate user ownership before registering tokens
2. **HTTPS Required:** FCM requires HTTPS in production
3. **Token Encryption:** Store tokens securely in database
4. **Rate Limiting:** Implement rate limiting for notification endpoints

### Reliability
1. **Invalid Token Cleanup:** Automatically remove invalid/expired tokens
2. **Retry Logic:** Implement retry for failed notifications
3. **Batch Sending:** Use `sendEachForMulticast` for efficiency
4. **Error Handling:** Log and handle FCM errors gracefully

### Performance
1. **Async Notifications:** Send notifications asynchronously (don't block main flow)
2. **Token Caching:** Cache tokens to reduce database queries
3. **Selective Sending:** Only send to relevant users/devices

### Mobile/PWA Considerations
1. **iOS Limitations:** Web push requires Safari 16.4+ on iOS
2. **PWA Required:** For best mobile experience, install as PWA
3. **Vibration Patterns:** Use appropriate vibration for mobile
4. **Action Buttons:** Add quick actions to notifications

## Troubleshooting

### Common Issues

1. **"Firebase config not available"**
   - Ensure all VITE_FIREBASE_* env vars are set
   - Restart dev server after changing env vars

2. **"No FCM token available"**
   - Check VAPID key is correct
   - Ensure service worker is registered
   - Check browser console for errors

3. **Notifications not appearing**
   - Check browser notification permissions
   - Verify service worker is active
   - Check Firebase Console for delivery issues

4. **Token registration fails**
   - Verify API endpoint is accessible
   - Check user authentication
   - Review server logs for errors

### Debug Commands

```bash
# Check service worker status
navigator.serviceWorker.ready.then(reg => console.log(reg))

# Check notification permission
console.log(Notification.permission)

# Get current FCM token (in browser console)
const messaging = firebase.messaging();
messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' }).then(console.log)
```

## Scalability Improvements

### Message Queue
For high-volume scenarios, implement a message queue:
```typescript
// Use Bull or similar for background processing
import { Queue } from 'bull';

const notificationQueue = new Queue('notifications');

// Add to queue instead of sending directly
await notificationQueue.add('send', {
  tokens: [...],
  payload: {...},
});

// Process in background
notificationQueue.process('send', async (job) => {
  await pushService.sendToTokens(job.data.tokens, job.data.payload);
});
```

### Analytics
Track notification metrics:
- Delivery rate
- Click-through rate
- Unsubscribe rate
- Token refresh frequency

### Topic-Based Subscriptions
For broader notifications:
```typescript
// Subscribe to topics
await messaging.subscribeToTopic(tokens, 'new_orders');

// Send to topic
await admin.messaging().send({
  topic: 'new_orders',
  notification: { title: '...', body: '...' },
});
```

## Files Created/Modified

### New Files
- `api/src/modules/notifications/entities/device-token.entity.ts`
- `api/src/modules/notifications/dto/device-token.dto.ts`
- `api/src/modules/notifications/push-notification.service.ts`
- `api/src/modules/notifications/order-notification.service.ts`
- `api/src/database/migrations/1738800000000-CreateDeviceTokensTable.ts`
- `client/src/services/firebase.ts`
- `client/src/hooks/usePushNotifications.ts`
- `client/public/firebase-messaging-sw.js`
- `backoffice/src/services/firebase.ts`
- `backoffice/src/hooks/usePushNotifications.ts`
- `backoffice/public/firebase-messaging-sw.js`
- `delivery-portal/src/services/firebase.ts`
- `delivery-portal/src/hooks/usePushNotifications.ts`
- `delivery-portal/public/firebase-messaging-sw.js`

### Modified Files
- `api/src/modules/notifications/notifications.module.ts`
- `api/src/modules/notifications/notifications.controller.ts`
- `api/src/modules/orders/orders.module.ts`
- `api/src/modules/orders/orders.service.ts`
- `api/src/modules/delivery/delivery.module.ts`
- `api/src/modules/delivery/delivery.service.ts`

## Installation

### Backend
```bash
cd api
npm install firebase-admin
```

### Frontend (each app)
```bash
npm install firebase
```

### Run Migration
```bash
cd api
npm run migration:run
```

## Testing

### Manual Testing
1. Enable notifications in browser
2. Create order from client app
3. Verify admin receives notification
4. Assign order to delivery
5. Verify customer and delivery receive notifications
6. Update delivery status
7. Verify customer receives status notification

### Automated Testing
```typescript
// Example test for push notification service
describe('PushNotificationService', () => {
  it('should send notification to admins', async () => {
    const spy = jest.spyOn(service, 'sendToTokens');
    await service.sendToAdmins({ title: 'Test', body: 'Test' });
    expect(spy).toHaveBeenCalled();
  });
});
```
