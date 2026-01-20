import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitOfMeasureDto {
  @ApiProperty({ description: 'Unit name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unit code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Category (Weight, Volume, Length, Unit)', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ description: 'Conversion ratio to base unit', default: 1 })
  @IsOptional()
  @IsNumber()
  ratio?: number;

  @ApiPropertyOptional({ description: 'Rounding precision' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  roundingPrecision?: string;

  @ApiPropertyOptional({ description: 'Is base unit for category', default: false })
  @IsOptional()
  @IsBoolean()
  isBaseUnit?: boolean;

  @ApiPropertyOptional({ description: 'Base unit ID' })
  @IsOptional()
  @IsNumber()
  baseUnitId?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitOfMeasureDto extends CreateUnitOfMeasureDto {}
