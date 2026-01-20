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

export type MovementStatus = 
  | 'draft' 
  | 'waiting' 
  | 'confirmed' 
  | 'assigned' 
  | 'done' 
  | 'cancelled';

export interface StockMovement {
  id: number;
  reference: string;
  movementType: MovementType;
  productId: number;
  sourceWarehouseId?: number | null;
  destWarehouseId?: number | null;
  quantity: number;
  unitOfMeasureId?: number | null;
  status: MovementStatus;
  dateScheduled?: string | null;
  dateDone?: string | null;
  origin?: string | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  createdByUserId?: number | null;
  validatedByUserId?: number | null;
  partnerName?: string | null;
  dateCreated: string;
  dateUpdated: string;
  product?: {
    id: number;
    name: string;
    code?: string;
  };
  sourceWarehouse?: {
    id: number;
    name: string;
  };
  destWarehouse?: {
    id: number;
    name: string;
  };
}

export interface StockQuant {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  incomingQuantity: number;
  outgoingQuantity: number;
  lotNumber?: string | null;
  serialNumber?: string | null;
  unitOfMeasureId?: number | null;
  dateCreated: string;
  dateUpdated: string;
  product?: {
    id: number;
    name: string;
    code?: string;
  };
  warehouse?: {
    id: number;
    name: string;
  };
}

export interface StockMovementsResponse {
  movements: StockMovement[];
}

export interface StockQuantsResponse {
  quants: StockQuant[];
}

export interface CreateStockMovementDTO {
  movementType: MovementType;
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

export interface UpdateStockMovementDTO {
  productId?: number;
  sourceWarehouseId?: number;
  destWarehouseId?: number;
  quantity?: number;
  unitOfMeasureId?: number;
  dateScheduled?: string;
  notes?: string;
}

export interface ValidateMovementDTO {
  movementId: number;
  userId?: number;
}

export interface InternalTransferDTO {
  productId: number;
  sourceWarehouseId: number;
  destWarehouseId: number;
  quantity: number;
  unitOfMeasureId?: number;
  notes?: string;
}

export interface StockFilters {
  productId?: number;
  warehouseId?: number;
  status?: MovementStatus;
  movementType?: MovementType;
  startDate?: string;
  endDate?: string;
}
