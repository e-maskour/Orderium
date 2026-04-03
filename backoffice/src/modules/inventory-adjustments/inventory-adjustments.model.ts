import {
  IInventoryAdjustment,
  IAdjustmentLine,
  AdjustmentStatus,
  UpdateInventoryAdjustmentDTO,
} from './inventory-adjustments.interface';

export class InventoryAdjustment implements IInventoryAdjustment {
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
  location?: { id: number; name: string };
  lines?: IAdjustmentLine[];

  constructor(data: IInventoryAdjustment) {
    this.id = data.id;
    this.reference = data.reference;
    this.name = data.name;
    this.locationId = data.locationId;
    this.status = data.status;
    this.adjustmentDate = data.adjustmentDate;
    this.userId = data.userId;
    this.notes = data.notes;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.location = data.location;
    this.lines = data.lines;
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
    return this.lines?.length ?? 0;
  }

  get locationDisplayName(): string {
    return this.location?.name ?? `Location #${this.locationId}`;
  }

  static fromApiResponse(data: any): InventoryAdjustment {
    return new InventoryAdjustment({
      id: data.id,
      reference: data.reference,
      name: data.name,
      locationId: data.locationId,
      status: data.status || 'draft',
      adjustmentDate: data.adjustmentDate || null,
      userId: data.userId || null,
      notes: data.notes || null,
      dateCreated: data.dateCreated || new Date().toISOString(),
      dateUpdated: data.dateUpdated || new Date().toISOString(),
      location: data.location,
      lines: data.lines,
    });
  }

  toUpdateDTO(): UpdateInventoryAdjustmentDTO {
    return {
      name: this.name,
      status: this.status,
      notes: this.notes ?? undefined,
    };
  }

  toJSON(): IInventoryAdjustment {
    return {
      id: this.id,
      reference: this.reference,
      name: this.name,
      locationId: this.locationId,
      status: this.status,
      adjustmentDate: this.adjustmentDate,
      userId: this.userId,
      notes: this.notes,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      location: this.location,
      lines: this.lines,
    };
  }
}
