# Morocom API — Copilot Instructions

> NestJS + TypeORM + PostgreSQL multi-tenant REST API
> Inherits all rules from root `.github/copilot-instructions.md`

## Quick Checklists

### Adding a new module
1. Create folder `src/modules/<name>/`
2. Add entity in `entities/<name>.entity.ts` with `isEnabled`, `dateCreated`, `dateUpdated`
3. Add DTOs: `create-<name>.dto.ts`, `update-<name>.dto.ts` (PartialType), `filter-<name>.dto.ts`, `<name>-response.dto.ts`
4. Write service — inject only `TenantConnectionService`, use getter for repos
5. Write controller — always `@PortalRoute()`, return `ApiRes(CODE, data)`
6. Register response codes in `src/common/response-codes.ts`
7. Register in `<name>.module.ts` and import into `app.module.ts`
8. Generate migration: `pnpm migration:generate -- src/database/migrations/<timestamp>-Create<Name>Table`

### Adding a new endpoint
1. Add response code constant in `response-codes.ts`
2. Add method to service
3. Add decorated method to controller returning `ApiRes(CODE, result)`
4. Add `@ApiOperation` + `@ApiResponse` Swagger decorators

## Common Imports (copy-paste)
```typescript
// Controller
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApiRes } from '../../common/api-response';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';

// Service
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Repository, In, Like, ILike } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

// Entity
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

// DTO
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, MaxLength, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
```

## Pagination helper (use for all list endpoints)
```typescript
async findAll(page = 1, perPage = 50, search?: string) {
  const qb = this.repo.createQueryBuilder('entity');
  if (search) qb.where('entity.name ILIKE :search', { search: `%${search}%` });
  qb.orderBy('entity.dateCreated', 'DESC').skip((page - 1) * perPage).take(perPage);
  const [items, totalCount] = await qb.getManyAndCount();
  return { items, totalCount };
}
// Controller usage:
const offset = (page - 1) * perPage;
return ApiRes(FEAT.FILTERED, items, { limit: perPage, offset, total: totalCount, hasNext: offset + perPage < totalCount, hasPrev: offset > 0 });
```

## Cache pattern
```typescript
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

constructor(
  private readonly tenantConnService: TenantConnectionService,
  @Inject(CACHE_MANAGER) private cacheManager: Cache,
) {}

// Usage:
const cacheKey = `feature:${id}`;
const cached = await this.cacheManager.get<Feature>(cacheKey);
if (cached) return cached;
const result = await this.repo.findOne({ where: { id } });
await this.cacheManager.set(cacheKey, result, 300); // 300s TTL
return result;
```
