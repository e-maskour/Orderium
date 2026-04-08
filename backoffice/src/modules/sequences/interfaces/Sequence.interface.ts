export interface ISequence {
  id: string;
  name: string;
  entityType: SequenceEntityType;
  prefix: string;
  suffix: string;
  nextNumber: number;
  numberLength: number;
  isActive: boolean;
  // UI-facing field names (mapped from API's yearInFormat / monthInFormat / etc.)
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
  /** Preview of the next document number (computed server-side) */
  nextDocumentNumber?: string;
}

export type SequenceEntityType =
  | 'invoice_sale'
  | 'invoice_purchase'
  | 'quote'
  | 'delivery_note'
  | 'price_request'
  | 'purchase_order'
  | 'payment'
  | 'receipt'
  | 'order';

export interface CreateSequenceDTO {
  name: string;
  entityType: SequenceEntityType;
  prefix: string;
  suffix: string;
  numberLength: number;
  isActive: boolean;
  yearInPrefix: boolean;
  monthInPrefix: boolean;
  dayInPrefix: boolean;
  trimesterInPrefix: boolean;
  resetPeriod?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateSequenceDTO extends Partial<CreateSequenceDTO> {}

export interface SequencePreview {
  preview: string;
}
