import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterCategoriesDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Search by name or description. A root category is returned when itself or any of its descendants matches.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category type',
    example: 'product',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
