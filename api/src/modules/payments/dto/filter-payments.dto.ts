import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType } from '../payment.entity';

/** Drop empty strings and the UI "all" sentinel so they never reach SQL. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === 'all' || value === null ? undefined : value;

export const PAYMENT_SORT_FIELDS = [
  'paymentDate',
  'paymentType',
  'referenceNumber',
  'amount',
  'createdAt',
] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];

export class FilterPaymentsDto {
  @ApiPropertyOptional({ description: 'Only payments of this invoice' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invoiceId?: number;

  @ApiPropertyOptional({
    description:
      'Search on invoice number, customer/supplier name or phone, reference',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PaymentType, description: 'Payment method' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional({
    description: 'Payment date lower bound, inclusive (YYYY-MM-DD)',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Payment date upper bound, inclusive (YYYY-MM-DD)',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Customer (partner) ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Supplier (partner) ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({
    enum: ['vente', 'achat'],
    description: 'Sales (vente) or purchase (achat) payments',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== '' && value !== 'all'
      ? value.toLowerCase()
      : undefined,
  )
  @IsIn(['vente', 'achat'])
  direction?: 'vente' | 'achat';

  @ApiPropertyOptional({
    description: '1-based page number. Omit page and limit to get all rows.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (max 500)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ enum: PAYMENT_SORT_FIELDS })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(PAYMENT_SORT_FIELDS as unknown as string[])
  sortField?: PaymentSortField;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== '' ? value.toUpperCase() : undefined,
  )
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
