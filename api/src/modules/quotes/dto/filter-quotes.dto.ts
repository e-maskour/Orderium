import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SORT_ORDERS, toSortOrder } from '../../../common/utils/list-sort';
import type { SortOrder } from '../../../common/utils/list-sort';

/** Columns the quote list may be sorted by (whitelist → SQL column in the service). */
export const QUOTE_SORT_FIELDS = [
  'number',
  'partnerName',
  'date',
  'dueDate',
  'validationDate',
  'subtotal',
  'tax',
  'total',
  'status',
] as const;
export type QuoteSortField = (typeof QUOTE_SORT_FIELDS)[number];

export class FilterQuotesDto {
  @ApiProperty({
    required: false,
    description: 'Search term for quote number or customer name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Quote status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Customer ID filter' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ required: false, description: 'Supplier ID filter' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({
    required: false,
    description: 'Start date for filtering quotes',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering quotes',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: QUOTE_SORT_FIELDS,
    description: 'Column to sort by (default: creation date, newest first)',
  })
  @IsOptional()
  @IsIn(QUOTE_SORT_FIELDS)
  sortField?: QuoteSortField;

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    description: 'Sort direction (default: ASC when sortField is set)',
  })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder;
}
