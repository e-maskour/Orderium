import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  code?: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiProperty()
  @Expose()
  cost: number;

  @ApiProperty()
  @Expose()
  isService: boolean;

  @ApiProperty()
  @Expose()
  isEnabled: boolean;

  @ApiProperty()
  @Expose()
  isPriceChangeAllowed: boolean;

  @ApiPropertyOptional()
  @Expose()
  imageUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  stock?: number;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
