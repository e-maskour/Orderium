export interface IPrinter {
  id: string;
  name: string;
  /** Manufacturer only — selects the ESC/POS dialect. */
  brand: 'epson' | 'star' | 'generic';
  connectionType: 'network' | 'usb' | 'system';
  /** thermal speaks ESC/POS; document takes a PDF through the OS spooler. */
  kind: 'thermal' | 'document';
  /** The shop this printer stands in. Jobs route by warehouse. */
  warehouseId: number | null;
  /** OS spooler queue name, for usb/system devices. */
  systemName: string | null;
  model: string | null;
  ip: string | null;
  port: number;
  paperWidth: 80 | 148;
  isDefault: boolean;
  documentTypes: string[];
  lastSeenAt: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrinterDTO {
  name: string;
  brand: IPrinter['brand'];
  connectionType: IPrinter['connectionType'];
  kind: IPrinter['kind'];
  warehouseId: number;
  systemName?: string;
  model?: string;
  ip?: string;
  port?: number;
  paperWidth: IPrinter['paperWidth'];
  isDefault?: boolean;
  documentTypes: string[];
}

export type UpdatePrinterDTO = Partial<CreatePrinterDTO>;

export type PrintJobStatus =
  | 'queued'
  | 'claimed'
  | 'printing'
  | 'done'
  | 'failed'
  | 'cancelled';

/** Polling stops at these. */
export const TERMINAL_STATUSES: PrintJobStatus[] = ['done', 'failed', 'cancelled'];

export interface IPrintJob {
  id: string;
  printerId: string | null;
  printer: IPrinter | null;
  userId: number | null;
  user: { id: number; name: string } | null;
  documentType: string;
  /** Integer id of the source document. */
  documentRef: number | null;
  warehouseId: number | null;
  agentId: string | null;
  status: PrintJobStatus;
  attempts: number;
  durationMs: number | null;
  errorMessage: string | null;
  queuedAt: string;
  completedAt: string | null;
  /** @deprecated legacy transports; still present on pre-agent history rows. */
  method: string | null;
  /** @deprecated superseded by documentRef. */
  documentId: string | null;
  printedAt: string;
}

export interface IPrintAgent {
  id: string;
  name: string;
  warehouseId: number;
  keyPrefix: string | null;
  lastSeenAt: string | null;
  version: string | null;
  platform: string | null;
  isEnabled: boolean;
  revokedAt: string | null;
  /** Derived server-side from the 30s heartbeat. */
  online: boolean;
}

export interface CreatePrintAgentDTO {
  name: string;
  warehouseId: number;
}

export interface QueuePrintJobDTO {
  documentType: string;
  documentRef: number;
  printerId?: string;
  warehouseId?: number;
  reprintSeq?: number;
}

export interface PrintJobsResponse {
  data: IPrintJob[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
