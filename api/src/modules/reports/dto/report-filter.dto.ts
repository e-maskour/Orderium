import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export class ReportFilterDto {
  @ApiPropertyOptional({ enum: DatePreset, default: DatePreset.THIS_MONTH })
  @IsOptional()
  @IsEnum(DatePreset)
  preset?: DatePreset = DatePreset.THIS_MONTH;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  perPage?: number = 50;
}

export class SalesReportFilterDto extends ReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by customer/partner ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  partnerId?: number;

  @ApiPropertyOptional({ description: 'Origin type: BACKOFFICE | CLIENT_POS | ADMIN_POS' })
  @IsOptional()
  @IsString()
  originType?: string;
}

export class StockReportFilterDto extends ReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;
}

export class AgingReportFilterDto {
  @ApiPropertyOptional({ example: '2025-12-31', description: 'Reference date for aging buckets' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Filter by partner ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  partnerId?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  perPage?: number = 50;
}

export class PartnerStatementFilterDto extends ReportFilterDto {
  @ApiPropertyOptional({ description: 'Partner ID (required for statement)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  partnerId?: number;
}

export class InvoiceReportFilterDto extends ReportFilterDto {
  @ApiPropertyOptional({ description: 'TVA rate filter (e.g. 20, 14, 10, 7, 0)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxRate?: number;
}
