/**
 * Represents a document-numbering sequence stored inside the
 * `configurations` JSONB column (entity = 'sequences').
 */
export interface SequenceConfig {
  id: string;
  name?: string;
  entityType: string;
  prefix?: string;
  suffix?: string;
  nextNumber: number;
  numberLength?: number;
  isActive?: boolean;
  yearInPrefix?: boolean;
  monthInPrefix?: boolean;
  dayInPrefix?: boolean;
  trimesterInPrefix?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Computed at read-time – not persisted */
  format?: string;
  nextDocumentNumber?: string;
  realTimeNextNumber?: number;
}
