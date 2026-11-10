import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MovementStatus,
  MovementType,
} from '../entities/stock-movement.entity';

/** Drop empty strings and the UI "all" sentinel so they never reach SQL. */
export const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === 'all' || value === null ? undefined : value;

/** Normalise "asc"/"desc" to upper-case; empty → undefined. */
export const toSortOrder = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value !== '' ? value.toUpperCase() : undefined;

/** Sortable fields (API name → SQL column, mapped in StockService). */
export const STOCK_MOVEMENT_SORT_FIELDS = [
  'reference',
  'movementType',
  'productName',
  'quantity',
  'status',
  'dateDone',
  'dateCreated',
] as const;
export type StockMovementSortField =
  (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];

export class FilterStockMovementDto {
  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ description: 'Source OR destination warehouse ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({ enum: MovementStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(MovementStatus)
  status?: MovementStatus;

  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(MovementType)
  movementType?: MovementType;

  @ApiPropertyOptional({
    description: 'Created-at lower bound, inclusive (ISO date or datetime)',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Created-at upper bound, inclusive. A date-only value covers the whole day.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search on reference, product name or product code',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ enum: STOCK_MOVEMENT_SORT_FIELDS })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(STOCK_MOVEMENT_SORT_FIELDS as unknown as string[])
  sortField?: StockMovementSortField;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
