import type { IDriveNode, IDriveVersion, IDriveTag, DrivePermission } from './drive.interface';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📋',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📋',
  'text/plain': '📃',
  'text/csv': '📊',
  'video/mp4': '🎬',
  'video/webm': '🎬',
  'application/zip': '🗜️',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'image/gif': '🖼️',
  'image/svg+xml': '🖼️',
};

const COLOR_MAP: Record<string, string> = {
  'application/pdf': '#ef4444',
  'application/msword': '#3b82f6',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#3b82f6',
  'application/vnd.ms-excel': '#22c55e',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#22c55e',
  'text/plain': '#64748b',
  'text/csv': '#22c55e',
  'video/mp4': '#a855f7',
  'video/webm': '#a855f7',
  'application/zip': '#f97316',
  'image/jpeg': '#ec4899',
  'image/png': '#ec4899',
  'image/webp': '#ec4899',
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getMimeIcon(mimeType: string | null | undefined): string {
  if (!mimeType) return '📄';
  return ICON_MAP[mimeType] ?? '📄';
}

export function getMimeColor(mimeType: string | null | undefined): string {
  if (!mimeType) return '#64748b';
  return COLOR_MAP[mimeType] ?? '#64748b';
}

export function isImage(mimeType: string | null | undefined): boolean {
  return !!mimeType?.startsWith('image/');
}

// ─── DriveNode Model ─────────────────────────────────────────────────────────

export class DriveNode implements IDriveNode {
  id: string;
  type: 'folder' | 'file';
  name: string;
  parentId: string | null;
  ownerId: number;
  ownerName?: string;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  storageKey?: string | null;
  storageBucket?: string;
  activeVersionId?: string | null;
  description?: string | null;
  isStarred: boolean;
  isTrashed: boolean;
  trashedAt?: string | null;
  currentVersion?: IDriveVersion;
  versionCount?: number;
  myPermission?: DrivePermission;
  shareCount?: number;
  tags?: IDriveTag[];
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;

  constructor(data: IDriveNode) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.parentId = data.parentId;
    this.ownerId = data.ownerId;
    this.ownerName = data.ownerName;
    this.mimeType = data.mimeType;
    this.extension = data.extension;
    this.sizeBytes = data.sizeBytes;
    this.storageKey = data.storageKey;
    this.storageBucket = data.storageBucket;
    this.activeVersionId = data.activeVersionId;
    this.description = data.description;
    this.isStarred = data.isStarred ?? false;
    this.isTrashed = data.isTrashed ?? false;
    this.trashedAt = data.trashedAt;
    this.currentVersion = data.currentVersion;
    this.versionCount = data.versionCount;
    this.myPermission = data.myPermission;
    this.shareCount = data.shareCount;
    this.tags = data.tags ?? [];
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get isFolder(): boolean {
    return this.type === 'folder';
  }

  get isFile(): boolean {
    return this.type === 'file';
  }

  get displaySize(): string {
    return formatBytes(this.sizeBytes);
  }

  get icon(): string {
    if (this.isFolder) return '📁';
    return getMimeIcon(this.mimeType);
  }

  get color(): string {
    if (this.isFolder) return '#f59e0b';
    return getMimeColor(this.mimeType);
  }

  get isImage(): boolean {
    return isImage(this.mimeType);
  }

  get canEdit(): boolean {
    return this.myPermission === 'editor' || this.myPermission === 'owner';
  }

  get canDelete(): boolean {
    return this.myPermission === 'owner';
  }

  get formattedDate(): string {
    return new Date(this.updatedAt).toLocaleDateString();
  }

  static fromApiResponse(data: any): DriveNode {
    return new DriveNode({
      id: data.id,
      type: data.type,
      name: data.name,
      parentId: data.parentId ?? data.parent_id ?? null,
      ownerId: data.ownerId ?? data.owner_id,
      ownerName: data.ownerName,
      mimeType: data.mimeType ?? data.mime_type,
      extension: data.extension,
      sizeBytes:
        data.sizeBytes != null
          ? Number(data.sizeBytes)
          : data.size_bytes != null
            ? Number(data.size_bytes)
            : null,
      storageKey: data.storageKey ?? data.storage_key,
      storageBucket: data.storageBucket ?? data.storage_bucket,
      activeVersionId: data.activeVersionId ?? data.active_version_id,
      description: data.description,
      isStarred: data.isStarred ?? data.is_starred ?? false,
      isTrashed: data.isTrashed ?? data.is_trashed ?? false,
      trashedAt: data.trashedAt ?? data.trashed_at,
      currentVersion: data.currentVersion ?? data.current_version,
      versionCount: data.versionCount ?? data.version_count,
      myPermission: data.myPermission ?? data.my_permission,
      shareCount: data.shareCount ?? data.share_count,
      tags: data.tags ?? [],
      createdBy: data.createdBy ?? data.created_by,
      updatedBy: data.updatedBy ?? data.updated_by,
      createdAt: data.createdAt ?? data.created_at,
      updatedAt: data.updatedAt ?? data.updated_at,
    });
  }
}
