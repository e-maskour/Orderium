import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, MovementStatus } from '../entities/stock-movement.entity';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Movement type', enum: MovementType })
  @IsEnum(MovementType)
  movementType: MovementType;

  @ApiProperty({ description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({ description: 'Source warehouse ID' })
  @IsOptional()
  @IsNumber()
  sourceWarehouseId?: number;

  @ApiPropertyOptional({ description: 'Destination warehouse ID' })
  @IsOptional()
  @IsNumber()
  destWarehouseId?: number;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measure ID' })
  @IsOptional()
  @IsNumber()
  unitOfMeasureId?: number;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  dateScheduled?: Date;

  @ApiPropertyOptional({ description: 'Origin reference (invoice, order, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  origin?: string;

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

  @ApiPropertyOptional({ description: 'Partner name (customer/supplier)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partnerName?: string;
}

export class UpdateStockMovementDto {
  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Status', enum: MovementStatus })
  @IsOptional()
  @IsEnum(MovementStatus)
  status?: MovementStatus;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  dateScheduled?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ValidateMovementDto {
  @ApiProperty({ description: 'Movement ID' })
  @IsNumber()
  movementId: number;

  @ApiPropertyOptional({ description: 'User ID who validates' })
  @IsOptional()
  @IsNumber()
  userId?: number;
}

export class InternalTransferDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Source warehouse ID' })
  @IsNumber()
  sourceWarehouseId: number;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsNumber()
  destWarehouseId: number;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measure ID' })
  @IsOptional()
  @IsNumber()
  unitOfMeasureId?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
