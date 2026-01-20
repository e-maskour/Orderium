export type AdjustmentStatus = 'draft' | 'in_progress' | 'done' | 'cancelled';

export interface InventoryAdjustment {
  id: number;
  reference: string;
  name: string;
  locationId: number;
  status: AdjustmentStatus;
  adjustmentDate?: string | null;
  userId?: number | null;
  notes?: string | null;
  dateCreated: string;
  dateUpdated: string;
  location?: {
    id: number;
    name: string;
  };
  lines?: AdjustmentLine[];
}

export interface AdjustmentLine {
  id: number;
  adjustmentId: number;
  productId: number;
  theoreticalQuantity: number;
  countedQuantity: number;
  difference: number;
  lotNumber?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  dateCreated: string;
  dateUpdated: string;
  product?: {
    id: number;
    name: string;
    code?: string;
  };
}

export interface InventoryAdjustmentsResponse {
  adjustments: InventoryAdjustment[];
}

export interface AdjustmentLineDTO {
  productId: number;
  theoreticalQuantity: number;
  countedQuantity: number;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export interface CreateInventoryAdjustmentDTO {
  name: string;
  locationId: number;
  userId?: number;
  notes?: string;
  lines?: AdjustmentLineDTO[];
}

export interface UpdateInventoryAdjustmentDTO {
  name?: string;
  status?: AdjustmentStatus;
  notes?: string;
  lines?: AdjustmentLineDTO[];
}

export interface ValidateAdjustmentDTO {
  adjustmentId: number;
  userId?: number;
}

export interface AdjustmentFilters {
  locationId?: number;
  status?: AdjustmentStatus;
  startDate?: string;
  endDate?: string;
}
