import { IPrinter } from './printers.interface';

export class Printer implements IPrinter {
  id: string;
  name: string;
  brand: IPrinter['brand'];
  connectionType: IPrinter['connectionType'];
  kind: IPrinter['kind'];
  warehouseId: number | null;
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

  constructor(data: IPrinter) {
    this.id = data.id;
    this.name = data.name;
    this.brand = data.brand;
    this.connectionType = data.connectionType;
    this.kind = data.kind;
    this.warehouseId = data.warehouseId;
    this.systemName = data.systemName;
    this.model = data.model;
    this.ip = data.ip;
    this.port = data.port;
    this.paperWidth = data.paperWidth;
    this.isDefault = data.isDefault;
    this.documentTypes = data.documentTypes;
    this.lastSeenAt = data.lastSeenAt;
    this.isEnabled = data.isEnabled;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromApiResponse(data: any): Printer {
    return new Printer({
      id: data.id,
      name: data.name,
      brand: data.brand,
      connectionType: data.connectionType ?? data.connection_type,
      kind: data.kind ?? 'thermal',
      warehouseId: data.warehouseId ?? data.warehouse_id ?? null,
      systemName: data.systemName ?? data.system_name ?? null,
      model: data.model ?? null,
      ip: data.ip ?? null,
      port: data.port ?? 8008,
      paperWidth: data.paperWidth ?? data.paper_width ?? 80,
      isDefault: data.isDefault ?? data.is_default ?? false,
      documentTypes: data.documentTypes ?? data.document_types ?? [],
      lastSeenAt: data.lastSeenAt ?? data.last_seen_at ?? null,
      isEnabled: data.isEnabled ?? data.is_enabled ?? true,
      createdAt: data.createdAt ?? data.created_at,
      updatedAt: data.updatedAt ?? data.updated_at,
    });
  }
}
