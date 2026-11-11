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

/** Columns the invoice list may be sorted by (whitelist → SQL column in the service). */
export const INVOICE_SORT_FIELDS = [
  'number',
  'partnerName',
  'date',
  'dueDate',
  'validationDate',
  'subtotal',
  'tax',
  'total',
  'paidAmount',
  'remainingAmount',
  'status',
] as const;
export type InvoiceSortField = (typeof INVOICE_SORT_FIELDS)[number];

export class FilterInvoicesDto {
  @ApiProperty({
    required: false,
    description: 'Search term for invoice number or customer name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Invoice status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Customer ID filter (for sales invoices)',
  })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({
    required: false,
    description: 'Supplier ID filter (for purchase invoices)',
  })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({
    required: false,
    description: 'Start date for filtering invoices',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering invoices',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: INVOICE_SORT_FIELDS,
    description: 'Column to sort by (default: creation date, newest first)',
  })
  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortField?: InvoiceSortField;

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    description: 'Sort direction (default: ASC when sortField is set)',
  })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder;
}
