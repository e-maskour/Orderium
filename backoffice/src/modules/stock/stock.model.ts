import { IStockMovement, IStockQuant } from './stock.interface';

export class StockMovement implements IStockMovement {
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

  constructor(data: IStockMovement) {
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

  get isDraft(): boolean {
    return this.status === 'draft';
  }

  get isWaiting(): boolean {
    return this.status === 'waiting';
  }

  get isDone(): boolean {
    return this.status === 'done';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get canValidate(): boolean {
    return ['draft', 'waiting', 'confirmed', 'assigned'].includes(this.status);
  }

  get canCancel(): boolean {
    return !this.isDone && !this.isCancelled;
  }

  get isInternal(): boolean {
    return this.movementType === 'internal';
  }

  get isInbound(): boolean {
    return this.movementType === 'receipt' || this.movementType === 'return_in' || this.movementType === 'production_in';
  }

  get isOutbound(): boolean {
    return this.movementType === 'delivery' || this.movementType === 'return_out' || this.movementType === 'production_out' || this.movementType === 'scrap';
  }

  get displayType(): string {
    const map: Record<string, string> = {
      receipt: 'Receipt',
      delivery: 'Delivery',
      internal: 'Internal Transfer',
      adjustment: 'Adjustment',
      production_in: 'Production In',
      production_out: 'Production Out',
      return_in: 'Return In',
      return_out: 'Return Out',
      scrap: 'Scrap',
    };
    return map[this.movementType] ?? this.movementType;
  }

  get displayStatus(): string {
    const map: Record<string, string> = {
      draft: 'Draft',
      waiting: 'Waiting',
      confirmed: 'Confirmed',
      assigned: 'Assigned',
      done: 'Done',
      cancelled: 'Cancelled',
    };
    return map[this.status] ?? this.status;
  }

  get isTracked(): boolean {
    return !!this.lotNumber || !!this.serialNumber;
  }

  get productDisplayName(): string {
    if (this.product?.code) return `${this.product.name} (${this.product.code})`;
    return this.product?.name ?? `Product #${this.productId}`;
  }

  static fromApiResponse(data: any): StockMovement {
    return new StockMovement({
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

  toJSON() {
    return {
      id: this.id,
      reference: this.reference,
      movementType: this.movementType,
      productId: this.productId,
      sourceWarehouseId: this.sourceWarehouseId,
      destWarehouseId: this.destWarehouseId,
      quantity: this.quantity,
      unitOfMeasureId: this.unitOfMeasureId,
      status: this.status,
      dateScheduled: this.dateScheduled,
      dateDone: this.dateDone,
      origin: this.origin,
      lotNumber: this.lotNumber,
      serialNumber: this.serialNumber,
      notes: this.notes,
      createdByUserId: this.createdByUserId,
      validatedByUserId: this.validatedByUserId,
      partnerName: this.partnerName,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      product: this.product,
      sourceWarehouse: this.sourceWarehouse,
      destWarehouse: this.destWarehouse,
    };
  }
}

export class StockQuant implements IStockQuant {
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

  constructor(data: IStockQuant) {
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

  get isAvailable(): boolean {
    return this.availableQuantity > 0;
  }

  get utilizationRate(): number {
    if (this.quantity === 0) return 0;
    return (this.reservedQuantity / this.quantity) * 100;
  }

  get netQuantity(): number {
    return this.quantity + this.incomingQuantity - this.outgoingQuantity;
  }

  get displayQuantity(): string {
    return `${this.availableQuantity} / ${this.quantity}`;
  }

  get isTracked(): boolean {
    return !!this.lotNumber || !!this.serialNumber;
  }

  get hasReserved(): boolean {
    return this.reservedQuantity > 0;
  }

  get productDisplayName(): string {
    return this.product?.name ?? `Product #${this.productId}`;
  }

  get warehouseDisplayName(): string {
    return this.warehouse?.name ?? `IWarehouse #${this.warehouseId}`;
  }

  static fromApiResponse(data: any): StockQuant {
    return new StockQuant({
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

  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantity: this.quantity,
      reservedQuantity: this.reservedQuantity,
      availableQuantity: this.availableQuantity,
      incomingQuantity: this.incomingQuantity,
      outgoingQuantity: this.outgoingQuantity,
      lotNumber: this.lotNumber,
      serialNumber: this.serialNumber,
      unitOfMeasureId: this.unitOfMeasureId,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      product: this.product,
      warehouse: this.warehouse,
    };
  }
}
