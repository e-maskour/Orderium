export interface IPrinter {
  id: string;
  name: string;
  brand: 'epson' | 'star' | 'generic' | 'qztray' | 'browser';
  connectionType: 'wifi' | 'usb' | 'network' | 'browser';
  model: string | null;
  ip: string | null;
  port: number;
  paperWidth: 58 | 80 | 210;
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
  model?: string;
  ip?: string;
  port?: number;
  paperWidth: IPrinter['paperWidth'];
  isDefault?: boolean;
  documentTypes: string[];
}

export type UpdatePrinterDTO = Partial<CreatePrinterDTO>;

export interface IPrintJob {
  id: string;
  printerId: string | null;
  printer: IPrinter | null;
  userId: number | null;
  user: { id: number; name: string } | null;
  documentType: string;
  documentId: string | null;
  method: string | null;
  status: 'success' | 'failed' | 'fallback';
  durationMs: number | null;
  errorMessage: string | null;
  printedAt: string;
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
