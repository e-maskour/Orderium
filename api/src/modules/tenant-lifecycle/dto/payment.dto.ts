import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsUUID,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export const PLAN_NAMES = ['trial', 'basic', 'pro', 'enterprise'] as const;
export const PAYMENT_TYPES = [
  'bank_transfer',
  'cash',
  'check',
  'card',
  'other',
] as const;
export const PAYMENT_STATUSES = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'void',
] as const;
export const INSTALLMENT_STATUSES = [
  'pending',
  'validated',
  'rejected',
  'refunded',
] as const;

// ─── Obligation (payment) ────────────────────────────────────────────────────

export class CreatePaymentDto {
  /** Total owed for the billing period. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountDue: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsIn(PLAN_NAMES as unknown as string[])
  planName: string;

  @IsIn(BILLING_CYCLES as unknown as string[])
  billingCycle: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  /** Defaults to `periodStart` when omitted. */
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountDue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsIn(PLAN_NAMES as unknown as string[])
  planName?: string;

  @IsOptional()
  @IsIn(BILLING_CYCLES as unknown as string[])
  billingCycle?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class VoidPaymentDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ListPaymentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  /** Derived status — computed in SQL, never stored. */
  @IsOptional()
  @IsIn(PAYMENT_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsIn(BILLING_CYCLES as unknown as string[])
  billingCycle?: string;

  @IsOptional()
  @IsIn(PLAN_NAMES as unknown as string[])
  planName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  /** Overlaps the billing period window. */
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  /** Matches tenant name, slug or contact name. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn([
    'dueDate',
    'periodStart',
    'periodEnd',
    'amountDue',
    'amountRemaining',
    'createdAt',
    'tenantName',
  ])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: string;
}

// ─── Tranche (installment) ───────────────────────────────────────────────────

export class CreateInstallmentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsIn(PAYMENT_TYPES as unknown as string[])
  paymentType: string;

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
  @MaxLength(2000)
  notes?: string;

  /**
   * Record and validate in one step. Defaults to true: a super-admin
   * entering a tranche by hand has already seen the money.
   */
  @IsOptional()
  @IsBoolean()
  validateImmediately?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatedBy?: string;
}

export class UpdateInstallmentDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsIn(PAYMENT_TYPES as unknown as string[])
  paymentType?: string;

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
  @MaxLength(2000)
  notes?: string;
}

export class ValidateInstallmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatedBy?: string;
}

export class RejectInstallmentDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class InstallmentIdParamDto {
  @IsUUID()
  id: string;
}
