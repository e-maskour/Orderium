// ─── Inventory Adjustments ────────────────────────────────────────────────────

export type AdjustmentStatus = 'draft' | 'in_progress' | 'done' | 'cancelled';

export interface IAdjustmentLine {
  id?: number;
  productId: number;
  productName?: string;
  productCode?: string;
  theoreticalQuantity: number;
  countedQuantity: number;
  difference: number;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export interface IInventoryAdjustment {
  id: number;
  reference: string;
  name: string;
  warehouseId: number;
  warehouseName?: string;
  status: AdjustmentStatus;
  adjustmentDate: string | null;
  userId: number | null;
  notes: string;
  lines: IAdjustmentLine[];
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateAdjustmentDto {
  name: string;
  warehouseId: number;
  notes?: string;
}

export interface ValidateAdjustmentDto {
  adjustmentId: number;
  lines: Array<{
    productId: number;
    countedQuantity: number;
    lotNumber?: string;
    serialNumber?: string;
    notes?: string;
  }>;
}

export interface AdjustmentFilters {
  warehouseId?: number;
  status?: AdjustmentStatus | string;
  startDate?: string;
  endDate?: string;
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export type MovementType =
  | 'receipt'
  | 'delivery'
  | 'internal'
  | 'adjustment'
  | 'production_in'
  | 'production_out'
  | 'return_in'
  | 'return_out'
  | 'scrap';

export type MovementStatus = 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancelled';

export interface IStockMovement {
  id: number;
  reference: string;
  movementType: MovementType;
  productId: number;
  productName?: string;
  productCode?: string;
  sourceWarehouseId: number | null;
  sourceWarehouseName?: string;
  destWarehouseId: number | null;
  destWarehouseName?: string;
  quantity: number;
  unitOfMeasureId: number | null;
  unitOfMeasureCode?: string;
  status: MovementStatus;
  dateScheduled: string | null;
  dateDone: string | null;
  origin: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  notes: string | null;
  partnerName: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateMovementDto {
  movementType: MovementType | string;
  productId: number;
  sourceWarehouseId?: number;
  destWarehouseId?: number;
  quantity: number;
  unitOfMeasureId?: number;
  dateScheduled?: string;
  origin?: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
  partnerName?: string;
}

export interface InternalTransferDto {
  productId: number;
  sourceWarehouseId: number;
  destWarehouseId: number;
  quantity: number;
  notes?: string;
}

export interface ValidateMovementDto {
  movementId: number;
}

export interface MovementFilters {
  productId?: number;
  warehouseId?: number;
  status?: MovementStatus | string;
  movementType?: MovementType | string;
  startDate?: string;
  endDate?: string;
}
