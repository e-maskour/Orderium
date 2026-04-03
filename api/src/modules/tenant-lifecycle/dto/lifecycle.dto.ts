import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
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

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsIn(['bank_transfer', 'cash', 'check', 'card', 'other'])
  paymentMethod?: string;

  @IsIn(['trial', 'basic', 'pro', 'enterprise'])
  planName: string;

  @IsIn(['monthly', 'yearly'])
  billingCycle: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** If true, immediately validate upon creation */
  @IsOptional()
  @IsBoolean()
  validateImmediately?: boolean;
}

export class ValidatePaymentDto {
  /** Email of the admin validating */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatedBy?: string;
}

export class RejectPaymentDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
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
