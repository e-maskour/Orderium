import { Expose, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductSummaryDto,
  WarehouseSummaryDto,
  UomSummaryDto,
} from '../../../common/dto/summary.dto';

/**
 * Warehouse response — admin/backoffice only (GET /inventory/warehouses).
 */
export class WarehouseResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  code: string;

  @ApiPropertyOptional()
  @Expose()
  address: string | null;

  @ApiPropertyOptional()
  @Expose()
  city: string | null;

  @ApiPropertyOptional()
  @Expose()
  phoneNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  managerName: string | null;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional()
  @Expose()
  latitude: number | null;

  @ApiPropertyOptional()
  @Expose()
  longitude: number | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Unit of measure response — admin/backoffice (GET /inventory/uom).
 */
export class UomResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  code: string;

  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  ratio: number;

  @ApiPropertyOptional()
  @Expose()
  roundingPrecision: string | null;

  @ApiProperty()
  @Expose()
  isBaseUnit: boolean;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ type: UomSummaryDto })
  @Expose()
  @Type(() => UomSummaryDto)
  baseUnit: UomSummaryDto | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Stock movement response — admin/backoffice (GET /inventory/movements).
 */
export class StockMovementResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  reference: string;

  @ApiProperty()
  @Expose()
  movementType: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  productId: number;

  @ApiPropertyOptional()
  @Expose()
  sourceWarehouseId: number | null;

  @ApiPropertyOptional()
  @Expose()
  destWarehouseId: number | null;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiPropertyOptional()
  @Expose()
  unitOfMeasureId: number | null;

  @ApiPropertyOptional()
  @Expose()
  sourceDocumentType: string | null;

  @ApiPropertyOptional()
  @Expose()
  sourceDocumentId: number | null;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  dateScheduled: Date | null;

  @ApiPropertyOptional({ type: ProductSummaryDto })
  @Expose()
  @Type(() => ProductSummaryDto)
  product: ProductSummaryDto | null;

  @ApiPropertyOptional({ type: WarehouseSummaryDto })
  @Expose()
  @Type(() => WarehouseSummaryDto)
  sourceWarehouse: WarehouseSummaryDto | null;

  @ApiPropertyOptional({ type: WarehouseSummaryDto })
  @Expose()
  @Type(() => WarehouseSummaryDto)
  destWarehouse: WarehouseSummaryDto | null;

  @ApiPropertyOptional({ type: UomSummaryDto })
  @Expose()
  @Type(() => UomSummaryDto)
  unitOfMeasure: UomSummaryDto | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(
    ({ obj }: { obj: Record<string, { code?: string } | null | undefined> }) =>
      (obj['unitOfMeasure'] as { code?: string } | null)?.code ?? null,
  )
  unitOfMeasureCode: string | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(
    ({ obj }: { obj: Record<string, { name?: string } | null | undefined> }) =>
      (obj['product'] as { name?: string } | null)?.name ?? null,
  )
  productName: string | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(
    ({ obj }: { obj: Record<string, { code?: string } | null | undefined> }) =>
      (obj['product'] as { code?: string } | null)?.code ?? null,
  )
  productCode: string | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(
    ({ obj }: { obj: Record<string, { name?: string } | null | undefined> }) =>
      (obj['sourceWarehouse'] as { name?: string } | null)?.name ?? null,
  )
  sourceWarehouseName: string | null;

  @ApiPropertyOptional()
  @Expose()
  @Transform(
    ({ obj }: { obj: Record<string, { name?: string } | null | undefined> }) =>
      (obj['destWarehouse'] as { name?: string } | null)?.name ?? null,
  )
  destWarehouseName: string | null;

  @ApiPropertyOptional()
  @Expose()
  dateDone: Date | null;

  @ApiPropertyOptional()
  @Expose()
  origin: string | null;

  @ApiPropertyOptional()
  @Expose()
  lotNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  serialNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  partnerName: string | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Adjustment line — nested inside InventoryAdjustmentResponseDto.
 */
export class AdjustmentLineResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  adjustmentId: number;

  @ApiProperty()
  @Expose()
  productId: number;

  @ApiProperty()
  @Expose()
  theoreticalQuantity: number;

  @ApiProperty()
  @Expose()
  countedQuantity: number;

  @ApiProperty()
  @Expose()
  difference: number;

  @ApiPropertyOptional()
  @Expose()
  lotNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  serialNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional({ type: ProductSummaryDto })
  @Expose()
  @Type(() => ProductSummaryDto)
  product: ProductSummaryDto | null;
}

/**
 * Inventory adjustment response — admin/backoffice (GET /inventory/adjustments).
 */
export class InventoryAdjustmentResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  reference: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  warehouseId: number;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiPropertyOptional()
  @Expose()
  adjustmentDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  userId: number | null;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional({ type: WarehouseSummaryDto })
  @Expose()
  @Type(() => WarehouseSummaryDto)
  warehouse: WarehouseSummaryDto | null;

  @ApiProperty({ type: [AdjustmentLineResponseDto] })
  @Expose()
  @Type(() => AdjustmentLineResponseDto)
  lines: AdjustmentLineResponseDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Stock quant response — admin/backoffice (GET /inventory/stock).
 */
export class StockQuantResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  productId: number;

  @ApiProperty()
  @Expose()
  warehouseId: number;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  reservedQuantity: number;

  @ApiProperty()
  @Expose()
  availableQuantity: number;

  @ApiProperty()
  @Expose()
  incomingQuantity: number;

  @ApiProperty()
  @Expose()
  outgoingQuantity: number;

  @ApiPropertyOptional()
  @Expose()
  unitOfMeasureId: number | null;

  @ApiPropertyOptional({ type: ProductSummaryDto })
  @Expose()
  @Type(() => ProductSummaryDto)
  product: ProductSummaryDto | null;

  @ApiPropertyOptional({ type: WarehouseSummaryDto })
  @Expose()
  @Type(() => WarehouseSummaryDto)
  warehouse: WarehouseSummaryDto | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;
}
