import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Full brand response — admin/backoffice (GET /brands, GET /brands/:id).
 * Does NOT include the products[] relation; productCount carries the count.
 */
export class BrandResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

  @ApiPropertyOptional()
  @Expose()
  logoUrl: string | null;

  @ApiPropertyOptional({
    description: 'Logo public ID from the storage provider',
  })
  @Expose()
  logoPublicId: string | null;

  @ApiPropertyOptional()
  @Expose()
  website: string | null;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Number of products using this brand' })
  @Expose()
  productCount: number;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
