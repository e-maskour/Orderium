import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Product code', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Product cost', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Is this a service?', default: false })
  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @ApiPropertyOptional({ description: 'Is product enabled?', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Can price be changed?', default: true })
  @IsOptional()
  @IsBoolean()
  isPriceChangeAllowed?: boolean;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Stock quantity', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Default tax percentage', minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultTax?: number;

  @ApiPropertyOptional({ description: 'Minimum price', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Sale tax percentage', minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  saleTax?: number;

  @ApiPropertyOptional({ description: 'Purchase tax percentage', minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseTax?: number;

  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Category IDs', type: [Number] })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({ description: 'Sale unit of measure ID' })
  @IsOptional()
  @IsNumber()
  saleUnitId?: number;

  @ApiPropertyOptional({ description: 'Purchase unit of measure ID' })
  @IsOptional()
  @IsNumber()
  purchaseUnitId?: number;
}
