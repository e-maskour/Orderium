# Internationalization (i18n) Structure

This folder contains all translation files for the Orderium backoffice application, organized by locale and module for better maintainability.

## Structure

```
langs/
├── ar_MA/          # Moroccan Arabic translations
│   ├── auth.ts         # Authentication & login
│   ├── common.ts       # Common/shared translations
│   ├── delivery.ts     # Delivery persons module
│   ├── invoices.ts     # Invoices module
│   ├── notifications.ts # Notifications
│   ├── orders.ts       # Orders module
│   ├── partners.ts     # Partners (customers & suppliers)
│   ├── pos.ts          # Point of Sale module
│   ├── products.ts     # Products module
│   └── index.ts        # Aggregates all modules
│
├── fr_FR/          # French translations
│   ├── auth.ts
│   ├── common.ts
│   ├── delivery.ts
│   ├── invoices.ts
│   ├── notifications.ts
│   ├── orders.ts
│   ├── partners.ts
│   ├── pos.ts
│   ├── products.ts
│   └── index.ts
│
└── README.md       # This file
```

## Module Organization

### common.ts
Contains translations for:
- App branding
- Navigation
- Common actions (create, update, delete, save, cancel, etc.)
- Common fields (name, email, phone, address, status, actions, etc.)
- Status values (active, inactive, enabled, disabled)
- Search & filter
- Pagination
- Loading states
- Selection actions
- Currency
- Date filters
- Language toggle
- Error messages

### auth.ts
Contains translations for:
- Login & authentication
- Logout
- Password fields
- Invalid credentials
- Access control messages

### partners.ts
Contains translations for:
- Customers management
- Suppliers management
- Partner form fields
- Business identifiers (ICE, IF, CNSS, RC, Patente, TVA)
- Partner type (individual, company)

### products.ts
Contains translations for:
- Product management
- Product form fields
- Product attributes
- Bulk operations

### orders.ts
Contains translations for:
- Order management
- Order status values
- Order details
- Order actions
- Assignment operations
- KPIs

### invoices.ts
Contains translations for:
- Invoice management
- Invoice status values
- Payment status values
- Invoice items
- Payment operations
- Invoice statistics

### delivery.ts
Contains translations for:
- Delivery persons management
- Delivery person actions
- Validation messages

### notifications.ts
Contains translations for:
- Notification types
- Notification actions
- Time indicators
- Status translations for notifications

### pos.ts
Contains translations for:
- Point of Sale interface
- Cart operations
- Customer selection
- Document generation

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

## Nested Keys

Some translations use nested keys (e.g., `invoice.title`, `invoice.status.draft`). These are flattened in the module files for easier maintenance.

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
