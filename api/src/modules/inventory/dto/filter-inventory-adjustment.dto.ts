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
import { AdjustmentStatus } from '../entities/inventory-adjustment.entity';
import { emptyToUndefined, toSortOrder } from './filter-stock-movement.dto';

/** Sortable fields (API name → SQL column, mapped in InventoryAdjustmentService). */
export const ADJUSTMENT_SORT_FIELDS = [
  'reference',
  'name',
  'warehouseName',
  'adjustmentDate',
  'status',
  'dateCreated',
] as const;
export type AdjustmentSortField = (typeof ADJUSTMENT_SORT_FIELDS)[number];

export class FilterInventoryAdjustmentDto {
  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({ enum: AdjustmentStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(AdjustmentStatus)
  status?: AdjustmentStatus;

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

  @ApiPropertyOptional({ description: 'Search by reference or name' })
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

  @ApiPropertyOptional({ enum: ADJUSTMENT_SORT_FIELDS })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(ADJUSTMENT_SORT_FIELDS as unknown as string[])
  sortField?: AdjustmentSortField;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @Transform(toSortOrder)
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
