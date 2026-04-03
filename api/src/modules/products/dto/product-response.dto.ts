import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategorySummaryDto, UomSummaryDto } from '../../../common/dto/summary.dto';

class WarehouseSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  code: string | null;
}

/**
 * Full product response — used by admin/backoffice on GET /products and GET /products/:id.
 * Contains all fields needed for product management.
 */
export class ProductResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  code: string | null;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

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
  imageUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  stock: number | null;

  @ApiPropertyOptional()
  @Expose()
  stockAlertThreshold: number | null;

  @ApiProperty()
  @Expose()
  saleTax: number;

  @ApiProperty()
  @Expose()
  purchaseTax: number;

  @ApiProperty()
  @Expose()
  minPrice: number;

  @ApiPropertyOptional()
  @Expose()
  saleUnitId: number | null;

  @ApiPropertyOptional()
  @Expose()
  purchaseUnitId: number | null;

  @ApiPropertyOptional()
  @Expose()
  warehouseId: number | null;

  @ApiPropertyOptional({ type: WarehouseSummaryDto })
  @Expose()
  @Type(() => WarehouseSummaryDto)
  warehouse: WarehouseSummaryDto | null;

  @ApiPropertyOptional({ type: UomSummaryDto })
  @Expose()
  @Type(() => UomSummaryDto)
  saleUnitOfMeasure: UomSummaryDto | null;

  @ApiPropertyOptional({ type: UomSummaryDto })
  @Expose()
  @Type(() => UomSummaryDto)
  purchaseUnitOfMeasure: UomSummaryDto | null;

  @ApiProperty({ type: [CategorySummaryDto] })
  @Expose()
  @Type(() => CategorySummaryDto)
  categories: CategorySummaryDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Minimal product response for the client portal.
 * Excludes cost, purchase fields, and internal thresholds.
 * Used on GET /products when called by portal-scoped tokens.
 */
export class ProductClientResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  code: string | null;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiPropertyOptional()
  @Expose()
  imageUrl: string | null;

  @ApiProperty()
  @Expose()
  isService: boolean;

  @ApiProperty()
  @Expose()
  isEnabled: boolean;

  @ApiProperty({ type: [CategorySummaryDto] })
  @Expose()
  @Type(() => CategorySummaryDto)
  categories: CategorySummaryDto[];

  @ApiPropertyOptional({ type: UomSummaryDto })
  @Expose()
  @Type(() => UomSummaryDto)
  saleUnitOfMeasure: UomSummaryDto | null;
}
