import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SORT_ORDERS, toSortOrder } from '../../../common/utils/list-sort';
import type { SortOrder } from '../../../common/utils/list-sort';

export const CAISSE_PAYMENT_STATUSES = ['paid', 'partial', 'unpaid'] as const;
export type CaissePaymentStatus = (typeof CAISSE_PAYMENT_STATUSES)[number];

/** Caisse table columns the client may sort by. */
export const CAISSE_SORT_FIELDS = [
  'orderNumber',
  'customerName',
  'paymentStatus',
  'total',
  'paidAmount',
  'remainingAmount',
  'dateCreated',
] as const;
export type CaisseSortField = (typeof CAISSE_SORT_FIELDS)[number];

/** Drop empty strings and the UI "all" sentinel so they never reach SQL. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === 'all' || value === null ? undefined : value;

export class FilterCaisseDto {
  @ApiPropertyOptional({ description: 'Search on order number or customer' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CAISSE_PAYMENT_STATUSES,
    description: 'Payment status (omit or "all" for every status)',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(CAISSE_PAYMENT_STATUSES as unknown as string[])
  status?: CaissePaymentStatus;

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

  @ApiPropertyOptional({
    enum: CAISSE_SORT_FIELDS,
    description: 'Column to sort by (default: creation date, newest first)',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(CAISSE_SORT_FIELDS as unknown as string[])
  sortField?: CaisseSortField;

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    description: 'Sort direction (default: ASC when sortField is set)',
  })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(SORT_ORDERS as unknown as string[])
  sortOrder?: SortOrder;
}
