import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsArray,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderOriginType } from '../entities/order.entity';
import { SORT_ORDERS, toSortOrder } from '../../../common/utils/list-sort';
import type { SortOrder } from '../../../common/utils/list-sort';

/** Columns the order list may be sorted by (whitelist → SQL column in the service). */
export const ORDER_SORT_FIELDS = [
  'number',
  'partnerName',
  'date',
  'dateCreated',
  'dueDate',
  'validationDate',
  'subtotal',
  'tax',
  'total',
  'paidAmount',
  'remainingAmount',
  'status',
  'originType',
] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export class FilterOrdersDto {
  @ApiProperty({
    required: false,
    description: 'Start date for filtering orders',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering orders',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Delivery status filter',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  deliveryStatus?: string[];

  @ApiProperty({
    required: false,
    description:
      'Order status filter (draft, validated, in_progress, confirmed, picked_up, delivered, invoiced, cancelled)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiProperty({ required: false, description: 'Order number filter' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ required: false, description: 'Customer ID filter' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ required: false, description: 'Supplier ID filter' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({ required: false, description: 'Delivery person ID filter' })
  @IsOptional()
  @IsNumber()
  deliveryPersonId?: number;

  @ApiProperty({
    required: false,
    description:
      'Filter by order origin type: BACKOFFICE | CLIENT_POS | ADMIN_POS',
    enum: OrderOriginType,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  @IsArray()
  @IsEnum(OrderOriginType, { each: true })
  originType?: OrderOriginType[];

  @ApiProperty({
    required: false,
    description: 'Free-text search: customer name, phone, or order number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ORDER_SORT_FIELDS,
    description: 'Column to sort by (default: creation date, newest first)',
  })
  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS)
  sortField?: OrderSortField;

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    description: 'Sort direction (default: ASC when sortField is set)',
  })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder;
}
