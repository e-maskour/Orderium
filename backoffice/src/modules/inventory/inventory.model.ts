import {
    IInventoryAdjustment,
    IAdjustmentLine,
    AdjustmentStatus,
    IStockMovement,
    MovementType,
    MovementStatus,
} from './inventory.interface';

// ─── Adjustment Line Model ────────────────────────────────────────────────────

export class AdjustmentLine implements IAdjustmentLine {
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

    constructor(data: IAdjustmentLine) {
        this.id = data.id;
        this.productId = data.productId;
        this.productName = data.productName;
        this.productCode = data.productCode;
        this.theoreticalQuantity = data.theoreticalQuantity;
        this.countedQuantity = data.countedQuantity;
        this.difference = data.difference;
        this.lotNumber = data.lotNumber;
        this.serialNumber = data.serialNumber;
        this.notes = data.notes;
    }

    get hasDiscrepancy(): boolean {
        return this.difference !== 0;
    }

    get absoluteDifference(): number {
        return Math.abs(this.difference);
    }

    get discrepancyType(): 'over' | 'under' | 'exact' {
        if (this.difference > 0) return 'over';
        if (this.difference < 0) return 'under';
        return 'exact';
    }

    toJSON(): IAdjustmentLine {
        return {
            id: this.id,
            productId: this.productId,
            productName: this.productName,
            productCode: this.productCode,
            theoreticalQuantity: this.theoreticalQuantity,
            countedQuantity: this.countedQuantity,
            difference: this.difference,
            lotNumber: this.lotNumber,
            serialNumber: this.serialNumber,
            notes: this.notes,
        };
    }

    static fromApiResponse(data: any): AdjustmentLine {
        return new AdjustmentLine({
            id: data.id,
            productId: data.productId,
            productName: data.productName,
            productCode: data.productCode,
            theoreticalQuantity: parseFloat(data.theoreticalQuantity) || 0,
            countedQuantity: parseFloat(data.countedQuantity) || 0,
            difference: parseFloat(data.difference) || 0,
            lotNumber: data.lotNumber,
            serialNumber: data.serialNumber,
            notes: data.notes,
        });
    }
}

// ─── Inventory Adjustment Model ───────────────────────────────────────────────

export class InventoryAdjustment implements IInventoryAdjustment {
    id: number;
    reference: string;
    name: string;
    warehouseId: number;
    warehouseName?: string;
    status: AdjustmentStatus;
    adjustmentDate: string | null;
    userId: number | null;
    notes: string;
    lines: AdjustmentLine[];
    dateCreated: string;
    dateUpdated: string;

    constructor(data: IInventoryAdjustment) {
        this.id = data.id;
        this.reference = data.reference;
        this.name = data.name;
        this.warehouseId = data.warehouseId;
        this.warehouseName = data.warehouseName;
        this.status = data.status;
        this.adjustmentDate = data.adjustmentDate;
        this.userId = data.userId;
        this.notes = data.notes;
        this.lines = (data.lines || []).map((l) => new AdjustmentLine(l));
        this.dateCreated = data.dateCreated;
        this.dateUpdated = data.dateUpdated;
    }

    get isDraft(): boolean {
        return this.status === 'draft';
    }

    get isInProgress(): boolean {
        return this.status === 'in_progress';
    }

    get isDone(): boolean {
        return this.status === 'done';
    }

    get isCancelled(): boolean {
        return this.status === 'cancelled';
    }

    get canStartCounting(): boolean {
        return this.isDraft;
    }

    get canValidate(): boolean {
        return this.isInProgress;
    }

    get canCancel(): boolean {
        return this.isDraft || this.isInProgress;
    }

    get displayStatus(): string {
        const map: Record<AdjustmentStatus, string> = {
            draft: 'Draft',
            in_progress: 'In Progress',
            done: 'Done',
            cancelled: 'Cancelled',
        };
        return map[this.status] ?? this.status;
    }

    get totalLines(): number {
        return this.lines.length;
    }

    get linesWithDiscrepancy(): AdjustmentLine[] {
        return this.lines.filter((l) => l.hasDiscrepancy);
    }

    get discrepancyCount(): number {
        return this.linesWithDiscrepancy.length;
    }

    static fromApiResponse(data: any): InventoryAdjustment {
        return new InventoryAdjustment({
            id: data.id,
            reference: data.reference ?? '',
            name: data.name,
            warehouseId: data.warehouseId,
            warehouseName: data.warehouseName,
            status: data.status ?? 'draft',
            adjustmentDate: data.adjustmentDate,
            userId: data.userId,
            notes: data.notes ?? '',
            lines: (data.lines || []).map((l: any) => AdjustmentLine.fromApiResponse(l)),
            dateCreated: data.dateCreated,
            dateUpdated: data.dateUpdated,
        });
    }

    toUpdateDTO() {
        return {
            name: this.name,
            status: this.status,
            notes: this.notes,
            lines: this.lines.map((l) => l.toJSON()),
        };
    }

    toJSON(): IInventoryAdjustment {
        return {
            id: this.id,
            reference: this.reference,
            name: this.name,
            warehouseId: this.warehouseId,
            warehouseName: this.warehouseName,
            status: this.status,
            adjustmentDate: this.adjustmentDate,
            userId: this.userId,
            notes: this.notes,
            lines: this.lines.map((l) => l.toJSON()),
            dateCreated: this.dateCreated,
            dateUpdated: this.dateUpdated,
        };
    }
}

// ─── Stock Movement Model ─────────────────────────────────────────────────────

export class StockMovement implements IStockMovement {
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

    constructor(data: IStockMovement) {
        this.id = data.id;
        this.reference = data.reference;
        this.movementType = data.movementType;
        this.productId = data.productId;
        this.productName = data.productName;
        this.productCode = data.productCode;
        this.sourceWarehouseId = data.sourceWarehouseId;
        this.sourceWarehouseName = data.sourceWarehouseName;
        this.destWarehouseId = data.destWarehouseId;
        this.destWarehouseName = data.destWarehouseName;
        this.quantity = data.quantity;
        this.unitOfMeasureId = data.unitOfMeasureId;
        this.unitOfMeasureCode = data.unitOfMeasureCode;
        this.status = data.status;
        this.dateScheduled = data.dateScheduled;
        this.dateDone = data.dateDone;
        this.origin = data.origin;
        this.lotNumber = data.lotNumber;
        this.serialNumber = data.serialNumber;
        this.notes = data.notes;
        this.partnerName = data.partnerName;
        this.dateCreated = data.dateCreated;
        this.dateUpdated = data.dateUpdated;
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

    get directionLabel(): string {
        if (this.isInbound) return 'Inbound';
        if (this.isOutbound) return 'Outbound';
        return 'Internal';
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
        const map: Record<MovementStatus, string> = {
            draft: 'Draft',
            waiting: 'Waiting',
            confirmed: 'Confirmed',
            assigned: 'Assigned',
            done: 'Done',
            cancelled: 'Cancelled',
        };
        return map[this.status] ?? this.status;
    }

    static fromApiResponse(data: any): StockMovement {
        return new StockMovement({
            id: data.id,
            reference: data.reference ?? '',
            movementType: data.movementType,
            productId: data.productId,
            productName: data.productName,
            productCode: data.productCode,
            sourceWarehouseId: data.sourceWarehouseId,
            sourceWarehouseName: data.sourceWarehouseName,
            destWarehouseId: data.destWarehouseId,
            destWarehouseName: data.destWarehouseName,
            quantity: parseFloat(data.quantity) || 0,
            unitOfMeasureId: data.unitOfMeasureId,
            unitOfMeasureCode: data.unitOfMeasureCode,
            status: data.status ?? 'draft',
            dateScheduled: data.dateScheduled,
            dateDone: data.dateDone,
            origin: data.origin,
            lotNumber: data.lotNumber,
            serialNumber: data.serialNumber,
            notes: data.notes,
            partnerName: data.partnerName,
            dateCreated: data.dateCreated,
            dateUpdated: data.dateUpdated,
        });
    }

    toJSON(): IStockMovement {
        return {
            id: this.id,
            reference: this.reference,
            movementType: this.movementType,
            productId: this.productId,
            productName: this.productName,
            productCode: this.productCode,
            sourceWarehouseId: this.sourceWarehouseId,
            sourceWarehouseName: this.sourceWarehouseName,
            destWarehouseId: this.destWarehouseId,
            destWarehouseName: this.destWarehouseName,
            quantity: this.quantity,
            unitOfMeasureId: this.unitOfMeasureId,
            unitOfMeasureCode: this.unitOfMeasureCode,
            status: this.status,
            dateScheduled: this.dateScheduled,
            dateDone: this.dateDone,
            origin: this.origin,
            lotNumber: this.lotNumber,
            serialNumber: this.serialNumber,
            notes: this.notes,
            partnerName: this.partnerName,
            dateCreated: this.dateCreated,
            dateUpdated: this.dateUpdated,
        };
    }
}
