# Response Serialization Layer

## Purpose

Every controller endpoint that returns a database entity must use `@Serialize(DtoClass)` to strip internal/sensitive fields and return only intentional data to the frontend.

**Rule:** Never return raw TypeORM entities. Always wrap with `ApiRes()` AND apply `@Serialize()`.

---

## How It Works

```
Controller method
  └─ calls service (returns entity/array)
  └─ calls ApiRes(CODE, data) → ApiResult instance
  └─ SerializeInterceptor runs:
       ├─ detects ApiResult instance
       ├─ reads DtoClass from @Serialize metadata
       ├─ transforms data via plainToInstance(DtoClass, data, { excludeExtraneousValues: true })
       └─ reconstructs ApiResult with serialized data
  └─ global ApiResponseInterceptor unwraps to JSON response
```

**Key behavior of `excludeExtraneousValues: true`:**  
Only fields decorated with `@Expose()` appear in the output. Any field not in the DTO is automatically stripped — including sensitive fields, internal IDs, and loaded relations you didn't intend to expose.

---

## The Decorator

```typescript
import { Serialize } from '../../common/decorators/serialize.decorator';

// Controller-level (all methods return same DTO shape):
@Serialize(PartnerResponseDto)
@Controller('partners')
export class PartnersController { ... }

// Method-level (different shapes per endpoint):
@Get()
@Serialize(OrderListResponseDto)
async findAll() { ... }

@Get(':id')
@Serialize(OrderDetailResponseDto)
async findOne() { ... }
```

---

## Summary DTOs

Nested relations use shared slim DTOs from `src/common/dto/summary.dto.ts` to avoid circular references and over-fetching.

| Summary DTO | Fields |
|---|---|
| `ProductSummaryDto` | id, name, code, imageUrl, isService |
| `PartnerSummaryDto` | id, name, phoneNumber |
| `CategorySummaryDto` | id, name, type |
| `UomSummaryDto` | id, name, code |
| `WarehouseSummaryDto` | id, name, code |
| `PermissionSummaryDto` | id, key, name, module, action |
| `RoleSummaryDto` | id, name, isSuperAdmin, permissions[] |

Use `@Type(() => SummaryDto)` on nested fields:

```typescript
@Expose()
@Type(() => ProductSummaryDto)
product: ProductSummaryDto;
```

---

## Writing a Response DTO

```typescript
import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductSummaryDto } from '../../../common/dto/summary.dto';

export class FeatureResponseDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  isEnabled: boolean;

  // Nested relation — use summary DTO
  @Expose()
  @Type(() => ProductSummaryDto)
  @ApiProperty({ type: ProductSummaryDto })
  product: ProductSummaryDto;

  @Expose()
  dateCreated: Date;

  @Expose()
  dateUpdated: Date;

  // ❌ password — NEVER expose this field (no @Expose)
  // ❌ passwordHash — NEVER expose this field
  // ❌ databaseName — internal infra field
}
```

---

## Adding Serialization to a New Module

1. Create `src/modules/<name>/dto/<name>-response.dto.ts` with `@Expose()` on every allowed field
2. For nested relations, use summary DTOs from `src/common/dto/summary.dto.ts` with `@Type()`
3. Add `@Serialize(FeatureResponseDto)` to the controller class (or per-method if list/detail shapes differ)
4. Import `Serialize` from `../../common/decorators/serialize.decorator`

---

## Modules with List vs Detail Variants

Some modules expose different shapes for list (slim) and detail (full with relations) endpoints:

| Module | List DTO | Detail DTO |
|---|---|---|
| Orders | `OrderListResponseDto` | `OrderDetailResponseDto` |
| Invoices | `InvoiceListResponseDto` | `InvoiceDetailResponseDto` |
| Quotes | `QuoteListResponseDto` | `QuoteDetailResponseDto` |
| Products | `ProductResponseDto` (admin) | `ProductClientResponseDto` (portal) |

---

## Skipped Controllers

The following controllers are intentionally **not** annotated with `@Serialize` because they build plain response objects directly in the controller rather than returning entities:

- `portal.controller.ts` — builds aggregated views (user + partner data) as plain objects
- `tenant.controller.ts` — super-admin controller that returns raw service results, not entity objects

---

## Files Reference

| File | Purpose |
|---|---|
| `src/common/interceptors/serialize.interceptor.ts` | Core interceptor |
| `src/common/decorators/serialize.decorator.ts` | `@Serialize()` decorator |
| `src/common/dto/summary.dto.ts` | Shared nested/summary DTOs |
| `src/modules/*/dto/*-response.dto.ts` | Per-module response DTOs |
