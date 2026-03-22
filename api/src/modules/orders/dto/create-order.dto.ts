import {
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Product description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity', minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Price (alias for unitPrice)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

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

  @ApiPropertyOptional({ description: 'Tax percentage', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: 'Item total after discount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number | null;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number (for lookup)' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'Supplier ID (for purchase orders)' })
  @IsOptional()
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Supplier name (for purchase orders)' })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ description: 'Supplier phone (for purchase orders)' })
  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @ApiPropertyOptional({
    description: 'Supplier address (for purchase orders)',
  })
  @IsOptional()
  @IsString()
  supplierAddress?: string;

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

  @ApiPropertyOptional({
    description: 'Customer-facing notes (alias for note)',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Order date' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Order total', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiPropertyOptional({ description: 'Order subtotal', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Tax amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

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

  @ApiPropertyOptional({
    description: 'Indicates if order was created from delivery portal',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fromPortal?: boolean;

  @ApiPropertyOptional({
    description: 'Indicates if order was created from client app',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fromClient?: boolean;

  @ApiPropertyOptional({
    description: 'Delivery status of the order',
    enum: [
      'pending',
      'assigned',
      'confirmed',
      'picked_up',
      'to_delivery',
      'in_delivery',
      'delivered',
      'canceled',
    ],
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;
}
