import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategorySummaryDto } from '../../../common/dto/summary.dto';

/**
 * Full category response — admin/backoffice only (GET /categories, GET /categories/:id).
 * Parent and children are slim CategorySummaryDto — no recursive full objects.
 * Does NOT include the products[] relation.
 */
export class CategoryResponseDto {
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

  @ApiPropertyOptional({ type: CategorySummaryDto })
  @Expose()
  @Type(() => CategorySummaryDto)
  parent: CategorySummaryDto | null;

  @ApiProperty({ type: [CategorySummaryDto] })
  @Expose()
  @Type(() => CategorySummaryDto)
  children: CategorySummaryDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
