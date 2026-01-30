import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadProductImageDto {
  // File is handled by @UseInterceptors(FileInterceptor('image'))
  // This DTO mainly documents the endpoint behavior
}

export class ProductImageResponseDto {
  @ApiProperty({ description: 'Image URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Public ID for deletion/management' })
  @IsString()
  publicId: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ description: 'Image size in bytes' })
  size: number;

  @ApiPropertyOptional({ description: 'Image format (jpg, png, webp, etc)' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Image width in pixels' })
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Image height in pixels' })
  @IsOptional()
  height?: number;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;

  @ApiPropertyOptional({ description: 'Thumbnail URL (optimized)' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class DeleteProductImageDto {
  @ApiProperty({ description: 'Public ID of product image to delete' })
  @IsString()
  publicId: string;
}
