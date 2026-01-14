import {
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Quantity', minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Discount amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Discount type (0=amount, 1=percentage)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  discountType?: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Customer phone number (for lookup)' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Admin ID' })
  @IsOptional()
  @IsInt()
  adminId?: number;

  @ApiPropertyOptional({ description: 'Cash register ID' })
  @IsOptional()
  @IsInt()
  cashRegisterId?: number;

  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Document type ID' })
  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Customer-facing note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Internal note' })
  @IsOptional()
  @IsString()
  internalNote?: string;
}
