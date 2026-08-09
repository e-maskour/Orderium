import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReportFilterDto } from '../../dto/report-filter.dto';

/**
 * Superset of every report filter.
 *
 * The PDF endpoint is generic over all 31 reports, so it accepts the union of
 * their filter fields. Each report service reads only the fields it knows about
 * and ignores the rest — exactly as it does today when the backoffice sends a
 * filter with unused keys.
 */
export class ReportPdfFilterDto extends ReportFilterDto {
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

  @ApiPropertyOptional({
    description: 'Filter by partner (customer/supplier) ID',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  partnerId?: number;

  @ApiPropertyOptional({
    description: 'Origin type: BACKOFFICE | CLIENT_POS | ADMIN_POS',
  })
  @IsOptional()
  @IsString()
  originType?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Reference date for aging buckets',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'TVA rate filter (e.g. 20, 14, 10, 7, 0)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxRate?: number;
}
