import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Recursive category node — used by the paginated tree endpoint
 * (GET /categories/paginated), where the full subtree of each root
 * category must survive serialization.
 *
 * Unlike CategoryResponseDto (whose `children` are slim CategorySummaryDto
 * and therefore stop at one level), every node here carries the same shape,
 * so descendants of any depth keep their description/isActive/children.
 */
export class CategoryTreeDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @Expose()
  imageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Category image public ID from the storage provider',
  })
  @Expose()
  imagePublicId: string | null;

  @ApiPropertyOptional()
  @Expose()
  parentId: number | null;

  @ApiProperty({ type: () => [CategoryTreeDto] })
  @Expose()
  @Type(() => CategoryTreeDto)
  children: CategoryTreeDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
