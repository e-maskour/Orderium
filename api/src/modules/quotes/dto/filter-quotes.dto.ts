import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterQuotesDto {
  @ApiProperty({
    required: false,
    description: 'Search term for quote number or customer name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Quote status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Customer ID filter' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ required: false, description: 'Supplier ID filter' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({
    required: false,
    description: 'Start date for filtering quotes',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering quotes',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
