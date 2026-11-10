import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  IsObject,
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

  /** Signed-in admin's account password, re-entered to authorise the deletion */
  @IsString()
  @IsNotEmpty()
  password: string;
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

  /** -1 = unlimited */
  @IsOptional()
  @IsNumber()
  maxWarehouses?: number;

  /** -1 = unlimited */
  @IsOptional()
  @IsNumber()
  maxDeliveryPersons?: number;

  /** { pos, delivery, client_portal, reports } */
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
