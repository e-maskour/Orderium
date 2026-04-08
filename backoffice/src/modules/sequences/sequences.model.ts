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
  resetPeriod: string;
  formatTemplate?: string;
  currentPeriodKey?: string;
  lastGeneratedAt?: string | null;
  lastResetAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  nextDocumentNumber?: string;

  constructor(data: ISequence) {
    this.id = String(data.id);
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
    this.resetPeriod = data.resetPeriod;
    this.formatTemplate = data.formatTemplate;
    this.currentPeriodKey = data.currentPeriodKey;
    this.lastGeneratedAt = data.lastGeneratedAt;
    this.lastResetAt = data.lastResetAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.nextDocumentNumber = data.nextDocumentNumber;
  }

  get displayName(): string {
    return this.name;
  }

  get effectiveNextNumber(): number {
    return this.nextNumber;
  }

  /**
   * Computes the next document number by substituting tokens in formatTemplate.
   * Tokens: YYYY → year, MM → month, DD → day, QQ → trimester (T1-T4),
   *         X...X (numberLength X's) → zero-padded nextNumber.
   */
  get nextFormattedNumber(): string {
    if (!this.formatTemplate) return String(this.nextNumber).padStart(this.numberLength, '0');

    // Derive date from currentPeriodKey when available
    let now = new Date();
    if (this.currentPeriodKey) {
      const parts = this.currentPeriodKey.split('-');
      const year = parseInt(parts[0], 10);
      if (!isNaN(year)) {
        const monthPart = parts[1] && !/^T/.test(parts[1]) ? parseInt(parts[1], 10) - 1 : now.getMonth();
        const dayPart = parts[2] ? parseInt(parts[2], 10) : 1;
        now = new Date(year, monthPart, dayPart);
      }
    }

    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const trimester = `T${Math.ceil((now.getMonth() + 1) / 3)}`;
    const counter = String(this.nextNumber).padStart(this.numberLength, '0');
    const counterToken = 'X'.repeat(this.numberLength);

    return this.formatTemplate
      .replace('YYYY', year)
      .replace('QQ', trimester)
      .replace('MM', month)
      .replace('DD', day)
      .replace(counterToken, counter);
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
      receipt: 'Receipt',
      order: 'POS Order',
    };
    return labels[this.entityType] ?? this.entityType;
  }

  /**
   * Map new API response shape (yearInFormat, monthInFormat, …) to the UI's
   * field names (yearInPrefix, monthInPrefix, …) for backward compatibility.
   */
  static fromApiResponse(data: any): Sequence {
    return new Sequence({
      id: String(data.id),
      name: data.name,
      entityType: data.entityType,
      prefix: data.prefix ?? '',
      suffix: data.suffix ?? '',
      nextNumber: data.nextNumber ?? 1,
      numberLength: data.numberLength ?? 4,
      isActive: data.isActive ?? true,
      yearInPrefix: data.yearInFormat ?? data.yearInPrefix ?? false,
      monthInPrefix: data.monthInFormat ?? data.monthInPrefix ?? false,
      dayInPrefix: data.dayInFormat ?? data.dayInPrefix ?? false,
      trimesterInPrefix: data.trimesterInFormat ?? data.trimesterInPrefix ?? false,
      resetPeriod: data.resetPeriod ?? 'yearly',
      formatTemplate: data.formatTemplate,
      currentPeriodKey: data.currentPeriodKey,
      lastGeneratedAt: data.lastGeneratedAt ?? null,
      lastResetAt: data.lastResetAt ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      nextDocumentNumber: data.previewNextNumber ?? data.nextDocumentNumber,
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
      resetPeriod: this.resetPeriod,
      formatTemplate: this.formatTemplate,
      currentPeriodKey: this.currentPeriodKey,
      lastGeneratedAt: this.lastGeneratedAt,
      lastResetAt: this.lastResetAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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
      resetPeriod: this.resetPeriod,
    };
  }
}
