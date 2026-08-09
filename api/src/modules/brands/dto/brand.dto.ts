import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ description: 'Brand name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Brand description' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Brand logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Brand logo public ID from CDN provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoPublicId?: string | null;

  @ApiPropertyOptional({ description: 'Brand website' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  website?: string | null;

  @ApiPropertyOptional({ description: 'Is brand active?', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ description: 'Brand name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Brand description' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Brand logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Brand logo public ID from CDN provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoPublicId?: string | null;

  @ApiPropertyOptional({ description: 'Brand website' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  website?: string | null;

  @ApiPropertyOptional({ description: 'Is brand active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
