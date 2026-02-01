# Internationalization (i18n) Structure

This folder contains all translation files for the Orderium client application, organized by locale and module for better maintainability.

## Structure

```
langs/
├── ar_MA/          # Moroccan Arabic translations
│   ├── auth.ts         # Authentication & login
│   ├── common.ts       # Common/shared translations
│   ├── cart.ts         # Cart & checkout
│   ├── documents.ts    # Invoice & receipt
│   ├── location.ts     # Geolocation
│   ├── notifications.ts # Notifications
│   ├── orders.ts       # Orders & tracking
│   ├── products.ts     # Products & categories
│   ├── profile.ts      # Profile management
│   └── index.ts        # Aggregates all modules
│
├── fr_FR/          # French translations
│   ├── auth.ts
│   ├── common.ts
│   ├── cart.ts
│   ├── documents.ts
│   ├── location.ts
│   ├── notifications.ts
│   ├── orders.ts
│   ├── products.ts
│   ├── profile.ts
│   └── index.ts
│
└── README.md       # This file
```

## Module Organization

### common.ts
Contains translations for:
- App branding
- Navigation
- Common actions (add, remove, save, cancel, etc.)
- Common fields (name, email, phone, address, etc.)
- General terms (all, total, subtotal, currency)
- Loading states
- Pagination
- Search & filter
- Error messages
- Validation messages
- Language toggle
- Time indicators
- Page not found

### auth.ts
Contains translations for:
- Login & authentication
- Registration & account creation
- Password fields
- Validation messages
- Success & error messages

### products.ts
Contains translations for:
- Product management
- Product categories
- Product actions
- Product status
- Search & browse

### cart.ts
Contains translations for:
- Shopping cart
- Cart items
- Checkout process
- Customer selection
- Order placement
- Success messages

### orders.ts
Contains translations for:
- Order management
- Order tracking
- Order status values
- Status descriptions
- Order errors & messages

### profile.ts
Contains translations for:
- Profile management
- Profile editing
- Update messages

### documents.ts
Contains translations for:
- Document types (invoice, receipt, delivery note)
- Document actions
- Invoice fields
- Receipt fields

### notifications.ts
Contains translations for:
- Notification types
- Notification actions
- Status translations for notifications

### location.ts
Contains translations for:
- Location detection
- Geolocation services
- Location errors
- Map integrations (Google Maps, Waze)

## Adding New Translations

### 1. Identify the Module
Determine which module the translation belongs to. If it doesn't fit any existing module, consider:
- Adding it to `common.ts` if it's used across multiple modules
- Creating a new module file if you have multiple related translations

### 2. Add to Both Locales
Always add translations to both language files:
- `langs/ar_MA/[module].ts` for Arabic
- `langs/fr_FR/[module].ts` for French

### 3. Example

Add a new translation to the products module:

**ar_MA/products.ts:**
```typescript
export default {
  // ... existing translations
  newField: 'الحقل الجديد',
};
```

**fr_FR/products.ts:**
```typescript
export default {
  // ... existing translations
  newField: 'Nouveau champ',
};
```

The translation will automatically be available in the app through the aggregated `index.ts` files.

## Usage in Components

Import and use the `useLanguage` hook:

```typescript
import { useLanguage } from '@/context/LanguageContext';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('products')}</h1>
      <p>{t('productName')}</p>
    </div>
  );
}
```

## Translation Keys

All translation keys are typed using TypeScript. The `TranslationKey` type is automatically generated from the Arabic translations object, ensuring type safety when using the `t()` function.

## Best Practices

1. **Consistency**: Use consistent naming across modules
2. **Clarity**: Use descriptive key names
3. **Organization**: Group related translations together with comments
4. **Completeness**: Always provide both Arabic and French translations
5. **Testing**: Test new translations in both languages before committing

## Locale Codes

- `ar_MA`: Moroccan Arabic (العربية المغربية)
- `fr_FR`: French (Français)

## Currency Formatting

The `formatCurrency` function in `i18n.ts` handles currency formatting for both locales:
- Arabic: `1,234.56 د.م`
- French: `1,234.56 DH`

## Phone Validation

The `validateMoroccanPhone` function validates Moroccan phone numbers in both formats:
- Local: `06XXXXXXXX` or `07XXXXXXXX`
- International: `+212 6XXXXXXXX` or `+212 7XXXXXXXX`
