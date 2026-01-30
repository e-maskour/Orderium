import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadImageDto {
  // File is handled by @UseInterceptors(FileInterceptor('image'))
  // This DTO mainly documents the endpoint behavior
}

export class ImageResponseDto {
  @ApiProperty({ description: 'Image URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Public ID for deletion/management' })
  @IsString()
  publicId: string;

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

  @ApiPropertyOptional({ description: 'Secure URL (for CDNs)' })
  @IsOptional()
  @IsString()
  secureUrl?: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;
}

export class DeleteImageDto {
  @ApiProperty({ description: 'Public ID of image to delete' })
  @IsString()
  @MaxLength(500)
  publicId: string;
}

export class GetOptimizedImageDto {
  @ApiPropertyOptional({ description: 'Image width for optimization' })
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Image height for optimization' })
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Crop mode: fill, fit, or scale' })
  @IsOptional()
  crop?: 'fill' | 'fit' | 'scale';
}
