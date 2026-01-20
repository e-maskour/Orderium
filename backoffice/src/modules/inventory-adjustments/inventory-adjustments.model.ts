import { InventoryAdjustment, AdjustmentLine } from './inventory-adjustments.interface';

export class InventoryAdjustmentModel implements InventoryAdjustment {
  id: number;
  reference: string;
  name: string;
  locationId: number;
  status: 'draft' | 'in_progress' | 'done' | 'cancelled';
  adjustmentDate?: string | null;
  userId?: number | null;
  notes?: string | null;
  dateCreated: string;
  dateUpdated: string;
  location?: { id: number; name: string };
  lines?: AdjustmentLine[];

  constructor(data: InventoryAdjustment) {
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

  static fromApiResponse(data: any): InventoryAdjustmentModel {
    return new InventoryAdjustmentModel({
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
}
