import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterInvoicesDto {
  @ApiProperty({
    required: false,
    description: 'Search term for invoice number or customer name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Invoice status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Customer ID filter (for sales invoices)',
  })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({
    required: false,
    description: 'Supplier ID filter (for purchase invoices)',
  })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({
    required: false,
    description: 'Start date for filtering invoices',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering invoices',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
