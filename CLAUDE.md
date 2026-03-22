# Orderium — Claude Instructions

## Project Identity
**Orderium** is a multi-tenant SaaS ERP. This is a pnpm monorepo.

| Folder | Framework | Role |
|--------|-----------|------|
| `api/` | NestJS 10, TypeORM, PostgreSQL | REST API |
| `backoffice/` | React 18, Vite, PrimeReact | Admin UI |
| `client/` | React 18, Vite | Customer portal |
| `delivery-portal/` | React 18, Vite | Delivery UI |
| `tenant-dashboard/` | React 18, Vite, Tailwind | Tenant self-service |
| `shared/` | TypeScript | Shared components |

## Essential Commands

```bash
# From repo root
docker compose -f docker-compose.dev.yml up -d     # Start all services

# API (from api/)
pnpm start:dev                                      # Start API in watch mode
pnpm migration:generate -- src/database/migrations/$(date +%s)-<MigrationName>
pnpm migration:run                                  # Run pending migrations
pnpm migration:revert                               # Revert last migration

# Frontend (from backoffice/ or client/ etc.)
pnpm dev                                            # Start Vite dev server
pnpm build                                          # Production build
pnpm lint                                           # ESLint

# From any app
pnpm test                                           # Jest unit tests
pnpm test:e2e                                       # E2E tests
```

## Critical Architecture Rules

### Multi-tenancy
- All business data is tenant-scoped
- NEVER inject `Repository<Entity>` directly in service constructors
- ALWAYS use `TenantConnectionService.getRepository(Entity)` via a getter property:
  ```typescript
  private get repo() { return this.tenantConnService.getRepository(MyEntity); }
  ```

### API Responses
- ALL controller methods must return `ApiRes(RESPONSE_CODE, data)`
- Response codes live in `api/src/common/response-codes.ts` — add new ones there first
- Format: `PREFIX + HTTP_STATUS + "_" + SEQUENCE` (e.g., `ORD201_01`)

### Auth
- JWT is required on all routes by default via `JwtAuthGuard`
- `@PortalRoute()` — marks a route as accessible by **portal-scoped tokens** (customers, delivery persons). WITHOUT it, portal tokens receive a 403. Only add to controllers that the customer portal, delivery portal, or tenant dashboard need to call. Do NOT add to backoffice/admin-only controllers.
- `@Public()` — bypasses JWT entirely (truly unauthenticated endpoints)
- Controllers with `@PortalRoute()`: `portal`, `products`, `partners`, `delivery`, `orders`, `notifications`, `pdf`
- Controllers WITHOUT `@PortalRoute()` (admin/backoffice only): all others (`categories`, `configurations`, `payments`, `invoices`, `quotes`, `images`, `roles`, `permissions`, `statistics`, `users`, `drive`, all inventory controllers, etc.)

### Deletes
- Hard deletes are intentional — `repository.remove()` and `repository.delete()` are both acceptable
- Use whichever is appropriate for the context

### Decimals
- Money/decimal columns MUST use `numericTransformer`:
  ```typescript
  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: numericTransformer })
  ```

## File Generation Templates

### When asked to create a new API module, generate:
1. `src/modules/<name>/entities/<name>.entity.ts`
2. `src/modules/<name>/dto/create-<name>.dto.ts`
3. `src/modules/<name>/dto/update-<name>.dto.ts` (PartialType)
4. `src/modules/<name>/dto/filter-<name>.dto.ts`
5. `src/modules/<name>/dto/<name>-response.dto.ts`
6. `src/modules/<name>/<name>.service.ts`
7. `src/modules/<name>/<name>.controller.ts`
8. `src/modules/<name>/<name>.module.ts`
9. Add response codes to `src/common/response-codes.ts`
10. Register module in `src/app.module.ts`

### When asked to create a new frontend module (backoffice/client), generate:
1. `src/modules/<name>/<name>.interface.ts`
2. `src/modules/<name>/<name>.model.ts`
3. `src/modules/<name>/<name>.service.ts`
4. `src/modules/<name>/index.ts` (barrel export)
5. Register routes in `src/common/api/`

## Existing Modules Reference

### API Modules (in `api/src/modules/`)
`auth` `categories` `configurations` `delivery` `drive` `health` `images` `inventory`
`invoices` `notifications` `onboarding` `orders` `partners` `payments` `pdf`
`permissions` `portal` `products` `quotes` `roles` `statistics` `tenant`
`tenant-lifecycle` `users`

### Backoffice Modules (in `backoffice/src/modules/`)
`categories` `company` `currencies` `delivery` `documents` `drive` `images`
`inventory` `inventory-adjustments` `invoices` `notifications` `orders` `partners`
`payment-terms` `payments` `permissions` `pos` `products` `quotes` `roles`
`sequences` `statistics` `stock` `taxes` `uom` `users` `warehouses`

## Do NOT
- Enable `synchronize: true` in TypeORM config
- Use `npm install` or `yarn` — always `pnpm`
- Import from `@nestjs/mapped-types` — use `@nestjs/swagger` for `PartialType`
- Add `console.log` in production code — use `Logger` from NestJS
- Return raw objects from controllers — always wrap with `ApiRes()`
- Skip `@ApiOperation` and `@ApiResponse` on controller methods
