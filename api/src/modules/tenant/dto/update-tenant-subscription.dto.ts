import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PLAN_KEYS, type PlanFeatures } from '../plan-features';

export class TenantAddonsDto {
  @ApiPropertyOptional({ description: 'Extra users (packs of 1)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  users?: number;

  @ApiPropertyOptional({ description: 'Extra warehouses (packs of 1)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  warehouses?: number;

  @ApiPropertyOptional({ description: 'Extra delivery persons (packs of 3)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  deliveryPersons?: number;

  @ApiPropertyOptional({ description: 'Extra storage (packs of 50 GB)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  storageMb?: number;

  @ApiPropertyOptional({
    description:
      'Features bought outside the plan: { pos, delivery, client_portal, reports }',
  })
  @IsOptional()
  @IsObject()
  features?: PlanFeatures;
}

/**
 * Changes a tenant's plan and/or add-ons. Limits and features are then
 * recomputed as plan + add-ons (any manual per-tenant override is reset).
 */
export class UpdateTenantSubscriptionDto {
  @ApiPropertyOptional({ enum: PLAN_KEYS })
  @IsOptional()
  @IsIn(PLAN_KEYS as unknown as string[])
  planName?: string;

  @ApiPropertyOptional({ type: () => TenantAddonsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantAddonsDto)
  addons?: TenantAddonsDto;
}
