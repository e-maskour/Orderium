import { ISequence, SequenceEntityType, UpdateSequenceDTO } from './interfaces/Sequence.interface';

export class Sequence implements ISequence {
  id: string;
  name: string;
  entityType: SequenceEntityType;
  prefix: string;
  suffix: string;
  nextNumber: number;
  numberLength: number;
  isActive: boolean;
  yearInPrefix: boolean;
  monthInPrefix: boolean;
  dayInPrefix: boolean;
  trimesterInPrefix: boolean;
  createdAt?: string;
  updatedAt?: string;
  realTimeNextNumber?: number;
  format?: string;
  nextDocumentNumber?: string;

  constructor(data: ISequence) {
    this.id = data.id;
    this.name = data.name;
    this.entityType = data.entityType;
    this.prefix = data.prefix;
    this.suffix = data.suffix;
    this.nextNumber = data.nextNumber;
    this.numberLength = data.numberLength;
    this.isActive = data.isActive;
    this.yearInPrefix = data.yearInPrefix;
    this.monthInPrefix = data.monthInPrefix;
    this.dayInPrefix = data.dayInPrefix;
    this.trimesterInPrefix = data.trimesterInPrefix;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.realTimeNextNumber = data.realTimeNextNumber;
    this.format = data.format;
    this.nextDocumentNumber = data.nextDocumentNumber;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get effectiveNextNumber(): number {
    return this.realTimeNextNumber ?? this.nextNumber;
  }

  get nextFormattedNumber(): string {
    if (this.nextDocumentNumber) return this.nextDocumentNumber;
    const num = String(this.effectiveNextNumber).padStart(this.numberLength, '0');
    return `${this.prefix}${num}${this.suffix}`;
  }

  get formattedPrefix(): string {
    const now = new Date();
    let p = this.prefix;
    if (this.yearInPrefix) p += now.getFullYear();
    if (this.trimesterInPrefix) p += `T${Math.ceil((now.getMonth() + 1) / 3)}`;
    if (this.monthInPrefix) p += String(now.getMonth() + 1).padStart(2, '0');
    if (this.dayInPrefix) p += String(now.getDate()).padStart(2, '0');
    return p;
  }

  get hasDateComponents(): boolean {
    return this.yearInPrefix || this.monthInPrefix || this.dayInPrefix || this.trimesterInPrefix;
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  get entityTypeLabel(): string {
    const labels: Record<SequenceEntityType, string> = {
      invoice_sale: 'Sale Invoice',
      invoice_purchase: 'Purchase Invoice',
      quote: 'Quote',
      delivery_note: 'Delivery Note',
      price_request: 'Price Request',
      purchase_order: 'Purchase Order',
      payment: 'Payment',
      credit_note: 'Credit Note',
      receipt: 'Receipt',
    };
    return labels[this.entityType] ?? this.entityType;
  }

  // Static factory method
  static fromApiResponse(data: any): Sequence {
    return new Sequence({
      id: data.id,
      name: data.name,
      entityType: data.entityType,
      prefix: data.prefix ?? '',
      suffix: data.suffix ?? '',
      nextNumber: data.nextNumber ?? 1,
      numberLength: data.numberLength ?? 4,
      isActive: data.isActive ?? true,
      yearInPrefix: data.yearInPrefix ?? false,
      monthInPrefix: data.monthInPrefix ?? false,
      dayInPrefix: data.dayInPrefix ?? false,
      trimesterInPrefix: data.trimesterInPrefix ?? false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      realTimeNextNumber: data.realTimeNextNumber,
      format: data.format,
      nextDocumentNumber: data.nextDocumentNumber,
    });
  }

  toJSON(): ISequence {
    return {
      id: this.id,
      name: this.name,
      entityType: this.entityType,
      prefix: this.prefix,
      suffix: this.suffix,
      nextNumber: this.nextNumber,
      numberLength: this.numberLength,
      isActive: this.isActive,
      yearInPrefix: this.yearInPrefix,
      monthInPrefix: this.monthInPrefix,
      dayInPrefix: this.dayInPrefix,
      trimesterInPrefix: this.trimesterInPrefix,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      realTimeNextNumber: this.realTimeNextNumber,
      format: this.format,
      nextDocumentNumber: this.nextDocumentNumber,
    };
  }

  toUpdateDTO(): UpdateSequenceDTO {
    return {
      name: this.name,
      prefix: this.prefix,
      suffix: this.suffix,
      numberLength: this.numberLength,
      isActive: this.isActive,
      yearInPrefix: this.yearInPrefix,
      monthInPrefix: this.monthInPrefix,
      dayInPrefix: this.dayInPrefix,
      trimesterInPrefix: this.trimesterInPrefix,
    };
  }
}
