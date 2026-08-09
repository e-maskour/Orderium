import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['product', 'customer', 'supplier', 'expense'])
  type: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Category image public ID from the storage provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagePublicId?: string | null;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['product', 'customer', 'supplier', 'expense'])
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Category image public ID from the storage provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagePublicId?: string | null;
}
