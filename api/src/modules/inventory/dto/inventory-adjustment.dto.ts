import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdjustmentStatus } from '../entities/inventory-adjustment.entity';

export class AdjustmentLineDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Theoretical quantity (system)' })
  @IsNumber()
  theoreticalQuantity: number;

  @ApiProperty({ description: 'Counted quantity (actual)' })
  @IsNumber()
  countedQuantity: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInventoryAdjustmentDto {
  @ApiProperty({ description: 'Adjustment name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsNumber()
  warehouseId: number;

  @ApiPropertyOptional({ description: 'User ID who creates' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Adjustment lines', type: [AdjustmentLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines?: AdjustmentLineDto[];
}

export class UpdateInventoryAdjustmentDto {
  @ApiPropertyOptional({ description: 'Adjustment name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Status', enum: AdjustmentStatus })
  @IsOptional()
  @IsEnum(AdjustmentStatus)
  status?: AdjustmentStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Adjustment lines', type: [AdjustmentLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines?: AdjustmentLineDto[];
}

export class ValidateAdjustmentDto {
  @ApiProperty({ description: 'Adjustment ID' })
  @IsNumber()
  adjustmentId: number;

  @ApiPropertyOptional({ description: 'User ID who validates' })
  @IsOptional()
  @IsNumber()
  userId?: number;
}
