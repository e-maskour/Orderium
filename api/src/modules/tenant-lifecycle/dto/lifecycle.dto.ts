import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class ChangeStatusDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}

export class ExtendTrialDto {
  @IsNumber()
  additionalDays: number;
}

export class ArchiveTenantDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;

  /** Must type the tenant name to confirm archiving */
  @IsString()
  confirmation: string;
}

export class DeleteTenantDto {
  /** Admin must type "DELETE {TENANT_NAME}" exactly */
  @IsString()
  confirmation: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsNumber()
  priceMonthly?: number;

  @IsOptional()
  @IsNumber()
  priceYearly?: number;

  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @IsOptional()
  @IsNumber()
  maxProducts?: number;

  @IsOptional()
  @IsNumber()
  maxOrdersPerMonth?: number;

  @IsOptional()
  @IsNumber()
  maxStorageMb?: number;

  @IsOptional()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
