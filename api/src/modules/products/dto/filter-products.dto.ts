import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class FilterProductsDto {
  @ApiProperty({ required: false, description: 'Search by product name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Search by product code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    required: false,
    enum: ['negative', 'zero', 'positive'],
    description: 'Filter by stock level',
  })
  @IsOptional()
  @IsEnum(['negative', 'zero', 'positive'])
  stockFilter?: 'negative' | 'zero' | 'positive';

  @ApiProperty({
    required: false,
    description: 'Filter by category IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  categoryIds?: number[];

  @ApiProperty({
    required: false,
    description: 'Filter by product type (service or not)',
  })
  @IsOptional()
  @IsBoolean()
  isService?: boolean;
}
