import { StockMovement, StockQuant } from './stock.interface';

export class StockMovementModel implements StockMovement {
  id: number;
  reference: string;
  movementType: 'receipt' | 'delivery' | 'internal' | 'adjustment' | 'production_in' | 'production_out' | 'return_in' | 'return_out' | 'scrap';
  productId: number;
  sourceWarehouseId?: number | null;
  destWarehouseId?: number | null;
  quantity: number;
  unitOfMeasureId?: number | null;
  status: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancelled';
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
  product?: { id: number; name: string; code?: string };
  sourceWarehouse?: { id: number; name: string };
  destWarehouse?: { id: number; name: string };

  constructor(data: StockMovement) {
    this.id = data.id;
    this.reference = data.reference;
    this.movementType = data.movementType;
    this.productId = data.productId;
    this.sourceWarehouseId = data.sourceWarehouseId;
    this.destWarehouseId = data.destWarehouseId;
    this.quantity = data.quantity;
    this.unitOfMeasureId = data.unitOfMeasureId;
    this.status = data.status;
    this.dateScheduled = data.dateScheduled;
    this.dateDone = data.dateDone;
    this.origin = data.origin;
    this.lotNumber = data.lotNumber;
    this.serialNumber = data.serialNumber;
    this.notes = data.notes;
    this.createdByUserId = data.createdByUserId;
    this.validatedByUserId = data.validatedByUserId;
    this.partnerName = data.partnerName;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.product = data.product;
    this.sourceWarehouse = data.sourceWarehouse;
    this.destWarehouse = data.destWarehouse;
  }

  static fromApiResponse(data: any): StockMovementModel {
    return new StockMovementModel({
      id: data.id,
      reference: data.reference,
      movementType: data.movementType || 'internal',
      productId: data.productId,
      sourceWarehouseId: data.sourceWarehouseId || null,
      destWarehouseId: data.destWarehouseId || null,
      quantity: data.quantity || 0,
      unitOfMeasureId: data.unitOfMeasureId || null,
      status: data.status || 'draft',
      dateScheduled: data.dateScheduled || null,
      dateDone: data.dateDone || null,
      origin: data.origin || null,
      lotNumber: data.lotNumber || null,
      serialNumber: data.serialNumber || null,
      notes: data.notes || null,
      createdByUserId: data.createdByUserId || null,
      validatedByUserId: data.validatedByUserId || null,
      partnerName: data.partnerName || null,
      dateCreated: data.dateCreated || new Date().toISOString(),
      dateUpdated: data.dateUpdated || new Date().toISOString(),
      product: data.product,
      sourceWarehouse: data.sourceWarehouse,
      destWarehouse: data.destWarehouse,
    });
  }
}

export class StockQuantModel implements StockQuant {
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
  product?: { id: number; name: string; code?: string };
  warehouse?: { id: number; name: string };

  constructor(data: StockQuant) {
    this.id = data.id;
    this.productId = data.productId;
    this.warehouseId = data.warehouseId;
    this.quantity = data.quantity;
    this.reservedQuantity = data.reservedQuantity;
    this.availableQuantity = data.availableQuantity;
    this.incomingQuantity = data.incomingQuantity;
    this.outgoingQuantity = data.outgoingQuantity;
    this.lotNumber = data.lotNumber;
    this.serialNumber = data.serialNumber;
    this.unitOfMeasureId = data.unitOfMeasureId;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.product = data.product;
    this.warehouse = data.warehouse;
  }

  static fromApiResponse(data: any): StockQuantModel {
    return new StockQuantModel({
      id: data.id,
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity || 0,
      reservedQuantity: data.reservedQuantity || 0,
      availableQuantity: data.availableQuantity || 0,
      incomingQuantity: data.incomingQuantity || 0,
      outgoingQuantity: data.outgoingQuantity || 0,
      lotNumber: data.lotNumber || null,
      serialNumber: data.serialNumber || null,
      unitOfMeasureId: data.unitOfMeasureId || null,
      dateCreated: data.dateCreated || new Date().toISOString(),
      dateUpdated: data.dateUpdated || new Date().toISOString(),
      product: data.product,
      warehouse: data.warehouse,
    });
  }
}
