import {
  IsOptional,
  IsString,
  IsObject,
  IsEmail,
  IsInt,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { PLAN_KEYS, type PlanFeatures } from '../plan-features';

/** All fields optional — only provided fields are applied. */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor must be a 6-digit hex color code',
  })
  primaryColor?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(PLAN_KEYS as unknown as string[])
  subscriptionPlan?: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(10000)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1000000)
  maxProducts?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(10000000)
  maxOrdersPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(10000000)
  maxStorageMb?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(10000)
  maxWarehouses?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(10000)
  maxDeliveryPersons?: number;

  /** Plan feature flags: { pos, delivery, client_portal, reports }. */
  @IsOptional()
  @IsObject()
  features?: PlanFeatures;

  /** Merge-update the settings JSON (replaces the whole object). */
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
