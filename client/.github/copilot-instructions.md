# Orderium Client — Copilot Instructions

> React + Vite + TypeScript — Customer-facing portal
> Inherits root `.github/copilot-instructions.md`

## Stack
- UI: PrimeReact + custom theme (`theme-preset.ts`)
- Auth: JWT stored in context (`src/context/`)
- HTTP: `apiClient` from `../../common`

## Module Pattern
Same as backoffice: `interface → model → service → index.ts`

## Component Rules
- Lightweight pages — customers only see orders, products, quotes
- Current modules: `auth`, `orders`, `partners`, `products`
- No admin functionality (no delete, no config, no user management)
- Always check auth context before rendering protected content

## Auth Pattern
```tsx
import { useAuth } from '../../context/AuthContext';
const { user, isAuthenticated } = useAuth();
if (!isAuthenticated) return <Navigate to="/login" />;
```
