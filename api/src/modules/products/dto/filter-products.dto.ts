import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsIn,
} from 'class-validator';

/** Columns the product list may be sorted by (whitelist → SQL column in the service). */
export const PRODUCT_SORT_FIELDS = [
  'name',
  'code',
  'price',
  'cost',
  'stock',
  'dateCreated',
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export class FilterProductsDto {
  @ApiProperty({ required: false, description: 'Search by product name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Search by product code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    required: false,
    enum: ['negative', 'zero', 'positive'],
    description: 'Filter by stock level',
  })
  @IsOptional()
  @IsEnum(['negative', 'zero', 'positive'])
  stockFilter?: 'negative' | 'zero' | 'positive';

  @ApiProperty({
    required: false,
    description: 'Filter by category IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  categoryIds?: number[];

  @ApiProperty({
    required: false,
    description: 'Filter by brand IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  brandIds?: number[];

  @ApiProperty({
    required: false,
    description: 'Filter by product type (service or not)',
  })
  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @ApiPropertyOptional({
    enum: PRODUCT_SORT_FIELDS,
    description: 'Column to sort by (default: name)',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortField?: ProductSortField;

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    description: 'Sort direction (default: ASC)',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
