import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

/** `YYYY-MM-DD`. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class MetricsRangeDto {
  @ApiPropertyOptional({
    description: 'Inclusive start date (YYYY-MM-DD). Defaults to 30 days ago.',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end date (YYYY-MM-DD). Defaults to today.',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

export class TenantMetricsListDto extends MetricsRangeDto {
  @ApiPropertyOptional({ description: 'Filter by tenant name or slug' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tenant status, or "all"',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: [
      'name',
      'ordersTotal',
      'ordersThisMonth',
      'usersTotal',
      'productsTotal',
      'quotesTotal',
      'invoicesTotal',
      'activeUsers',
      'apiCalls',
      'dbSizeBytes',
      'storageBytes',
      'revenueTotal',
      'lastActivityAt',
    ],
  })
  @IsOptional()
  @IsIn([
    'name',
    'ordersTotal',
    'ordersThisMonth',
    'usersTotal',
    'productsTotal',
    'quotesTotal',
    'invoicesTotal',
    'activeUsers',
    'apiCalls',
    'dbSizeBytes',
    'storageBytes',
    'revenueTotal',
    'lastActivityAt',
  ])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class SeriesQueryDto extends MetricsRangeDto {
  @ApiPropertyOptional({
    description: 'Comma-separated metric columns to return',
    example: 'ordersToday,activeUsers,apiCalls',
  })
  @IsOptional()
  @IsString()
  metrics?: string;
}

export class HealthQueryDto {
  @ApiPropertyOptional({
    description: 'How many hours back to report on (1-168). Defaults to 24.',
    default: 24,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(168)
  hours?: number;

  @ApiPropertyOptional({ description: 'Limit to a single tenant' })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  tenantId?: number;
}
