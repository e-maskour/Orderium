# Morocom — Claude Instructions

## Project Identity
**Morocom** is a multi-tenant SaaS ERP. This is a pnpm monorepo.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
