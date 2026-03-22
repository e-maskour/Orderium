# Orderium — GitHub Copilot Instructions

## Project Overview
**Orderium** is a multi-tenant SaaS ERP system. The monorepo contains:
| App | Stack | Purpose |
|-----|-------|---------|
| `api/` | NestJS + TypeORM + PostgreSQL | Central REST API (multi-tenant) |
| `backoffice/` | React + Vite + PrimeReact + TypeScript | Admin dashboard |
| `client/` | React + Vite + TypeScript | Customer-facing portal |
| `delivery-portal/` | React + Vite + TypeScript | Delivery operations UI |
| `tenant-dashboard/` | React + Vite + Tailwind | Tenant self-service UI |
| `shared/` | TypeScript | Shared UI components & assets |

**Package manager:** `pnpm`
**Database:** PostgreSQL (multi-tenant via `TenantConnectionService`)
**Auth:** JWT is enforced globally. `@PortalRoute()` allows portal-scoped tokens (customers, delivery persons) to access a route — without it only admin/backoffice tokens are accepted (portal tokens get 403). `@Public()` bypasses JWT entirely.

---

## API — NestJS Conventions

### Module Structure
Every feature lives in `api/src/modules/<feature>/` and follows this layout:
```
<feature>/
  dto/
    create-<feature>.dto.ts      # class-validator + class-transformer
    update-<feature>.dto.ts      # PartialType(CreateDto)
    filter-<feature>.dto.ts      # optional search/filter params
    <feature>-response.dto.ts    # @ApiProperty() for Swagger
  entities/
    <feature>.entity.ts          # TypeORM @Entity()
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.module.ts
```

### Controller Pattern
```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeatureResponseDto } from './dto/feature-response.dto';
import { ApiRes } from '../../common/api-response';
import { FEAT } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';

@ApiTags('Feature')
// @PortalRoute()  ← Add ONLY if customer/delivery portal needs this route.
//                   Omit for backoffice/admin-only controllers.
//                   @Public() if the endpoint needs no auth at all.
@Controller('feature')
export class FeatureController {
  private readonly logger = new Logger(FeatureController.name);
  constructor(private readonly featureService: FeatureService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created successfully', type: FeatureResponseDto })
  async create(@Body() dto: CreateFeatureDto) {
    const result = await this.featureService.create(dto);
    return ApiRes(FEAT.CREATED, result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, type: FeatureResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ApiRes(FEAT.DETAIL, await this.featureService.findOne(id));
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeatureDto) {
    return ApiRes(FEAT.UPDATED, await this.featureService.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.featureService.remove(id);
    return ApiRes(FEAT.DELETED, null);
  }
}
```

### Service Pattern (Multi-tenant)
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Feature } from './entities/feature.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@Injectable()
export class FeatureService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  // ALWAYS use getter — never inject Repository directly in constructor
  private get repo(): Repository<Feature> {
    return this.tenantConnService.getRepository(Feature);
  }

  async create(dto: CreateFeatureDto): Promise<Feature> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findOne(id: number): Promise<Feature> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Feature #${id} not found`);
    return entity;
  }

  async update(id: number, dto: UpdateFeatureDto): Promise<Feature> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
```

### Entity Pattern
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('features')
@Index(['name'])
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;                   // ALWAYS include — used for soft delete

  @CreateDateColumn({ name: 'date_created' })
  dateCreated: Date;

  @UpdateDateColumn({ name: 'date_updated' })
  dateUpdated: Date;

  // For decimal/money columns ALWAYS add transformer:
  // @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, transformer: numericTransformer })
  // price: number;
}
```

### DTO Pattern
```typescript
// create-feature.dto.ts
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ example: 'My Feature' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// update-feature.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateFeatureDto } from './create-feature.dto';
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}
```

### Response Codes
Always add response codes to `api/src/common/response-codes.ts` following the pattern:
```typescript
// Format: PREFIX + HTTP_STATUS + "_" + SEQUENCE
export const FEAT = {
  CREATED:  { code: 'FEAT201_01', status: 201, message: 'Feature created successfully' },
  LIST:     { code: 'FEAT200_01', status: 200, message: 'Features retrieved successfully' },
  DETAIL:   { code: 'FEAT200_02', status: 200, message: 'Feature retrieved successfully' },
  UPDATED:  { code: 'FEAT200_03', status: 200, message: 'Feature updated successfully' },
  DELETED:  { code: 'FEAT200_04', status: 200, message: 'Feature deleted successfully' },
  FILTERED: { code: 'FEAT200_05', status: 200, message: 'Features filtered successfully' },
} as const;
```

### Migration Pattern
```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateFeatureTable1700000000000 implements MigrationInterface {
  name = 'CreateFeatureTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'features',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'name', type: 'varchar', length: '255' },
        { name: 'is_enabled', type: 'boolean', default: true },
        { name: 'date_created', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'date_updated', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('features');
  }
}
```

---

## Frontend — React + TypeScript Conventions

### Module Structure (backoffice / client / portals)
```
src/modules/<feature>/
  index.ts                  # barrel export
  <feature>.interface.ts    # TypeScript interfaces & DTOs
  <feature>.model.ts        # Model class with static fromApiResponse()
  <feature>.service.ts      # API calls via apiClient
  <feature>.validation.ts   # Zod or yup schemas (if form-heavy)
```

### Interface & Model Pattern
```typescript
// feature.interface.ts
export interface IFeature {
  id: number;
  name: string;
  isEnabled: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateFeatureDTO {
  name: string;
  isEnabled?: boolean;
}

export interface UpdateFeatureDTO extends Partial<CreateFeatureDTO> {}

export interface FeaturesResponse {
  features: IFeature[];
  pagination?: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean; };
}

// feature.model.ts
import { IFeature, CreateFeatureDTO, UpdateFeatureDTO } from './feature.interface';

export class Feature implements IFeature {
  id: number;
  name: string;
  isEnabled: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IFeature) {
    this.id = data.id;
    this.name = data.name;
    this.isEnabled = data.isEnabled;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  static fromApiResponse(data: any): Feature {
    return new Feature({
      id: data.id,
      name: data.name,
      isEnabled: data.isEnabled ?? true,
      dateCreated: data.dateCreated || data.date_created,
      dateUpdated: data.dateUpdated || data.date_updated,
    });
  }
}
```

### Service Pattern
```typescript
// feature.service.ts
import { FeaturesResponse, IFeature, CreateFeatureDTO, UpdateFeatureDTO } from './feature.interface';
import { Feature } from './feature.model';
import { apiClient, API_ROUTES } from '../../common';

export class FeatureService {
  async getFeatures(params: { page?: number; limit?: number; search?: string } = {}): Promise<FeaturesResponse> {
    const { page = 1, limit = 50, search } = params;
    const body: Record<string, unknown> = {};
    if (search) body.search = search;

    const response = await apiClient.post<IFeature[]>(API_ROUTES.FEATURES.FILTER, body, {
      params: { page, perPage: limit },
    });

    const features = (response.data || []).map((f: any) => Feature.fromApiResponse(f));
    const total = (response.metadata as any)?.total || 0;

    return { features, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: (response.metadata as any)?.hasNext || false, hasPrev: (response.metadata as any)?.hasPrev || false } };
  }

  async getFeature(id: number): Promise<Feature> {
    const response = await apiClient.get<IFeature>(API_ROUTES.FEATURES.DETAIL(id));
    return Feature.fromApiResponse(response.data);
  }

  async createFeature(data: CreateFeatureDTO): Promise<Feature> {
    const response = await apiClient.post<IFeature>(API_ROUTES.FEATURES.CREATE, data);
    return Feature.fromApiResponse(response.data);
  }

  async updateFeature(id: number, data: UpdateFeatureDTO): Promise<Feature> {
    const response = await apiClient.patch<IFeature>(API_ROUTES.FEATURES.UPDATE(id), data);
    return Feature.fromApiResponse(response.data);
  }

  async deleteFeature(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.FEATURES.DELETE(id));
  }
}

export const featureService = new FeatureService();
```

### API Routes Registration
Add routes to the shared API_ROUTES object in `src/common/api/`:
```typescript
FEATURES: {
  FILTER: '/features/filter',
  CREATE: '/features/create',
  LIST: '/features',
  DETAIL: (id: number) => `/features/${id}`,
  UPDATE: (id: number) => `/features/${id}`,
  DELETE: (id: number) => `/features/${id}`,
},
```

---

## Global Rules (All Files)

- **Never use `any`** unless interfacing with raw API responses in `.fromApiResponse()`
- **Hard deletes are fine** — `repository.remove()` and `repository.delete()` are both acceptable
- **Decimal columns** in entities always use `numericTransformer`
- **No direct `Repository` injection** in services — use `TenantConnectionService.getRepository()`
- **`@PortalRoute()`** — add ONLY to controllers that customer/delivery portal apps must call (e.g. `portal`, `products`, `partners`, `delivery`, `orders`, `notifications`, `pdf`). Do NOT add to backoffice/admin-only controllers — doing so would allow customer tokens to hit admin endpoints (security bug).
- **`PartialType`** from `@nestjs/swagger` (not `@nestjs/mapped-types`) for update DTOs
- **`pnpm`** for all package installs — never `npm install` or `yarn add`
- **Migrations** over `synchronize: true` — never enable synchronize in production
- **Response codes** are registered in `api/src/common/response-codes.ts` first, then imported in controllers
- **`ApiRes(CODE, data)`** wraps ALL controller return values — never return raw objects
- **Barrel exports** (`index.ts`) in every module folder
- **camelCase** for TypeScript/JS, **snake_case** for DB column names
