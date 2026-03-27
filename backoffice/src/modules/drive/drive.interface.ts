// ─── Enums ───────────────────────────────────────────────────────────────────

export type DriveNodeType = 'folder' | 'file';
export type DrivePermission = 'viewer' | 'editor' | 'owner';
export type DriveShareTarget = 'user' | 'everyone';
export type DriveAction =
    | 'upload' | 'replace' | 'download' | 'delete' | 'restore'
    | 'create_folder' | 'rename' | 'move' | 'copy'
    | 'share' | 'unshare' | 'preview'
    | 'version_restore' | 'trash' | 'permanent_delete';

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface IDriveNode {
    id: string;
    type: DriveNodeType;
    name: string;
    parentId: string | null;
    ownerId: number;
    ownerName?: string;

    // File-only
    mimeType?: string | null;
    extension?: string | null;
    sizeBytes?: number | null;
    storageKey?: string | null;
    storageBucket?: string;
    activeVersionId?: string | null;

    // Meta
    description?: string | null;
    isStarred: boolean;
    isTrashed: boolean;
    trashedAt?: string | null;

    // Version info (populated on detail)
    currentVersion?: IDriveVersion;
    versionCount?: number;

    // Sharing
    myPermission?: DrivePermission;
    shareCount?: number;

    // Tags
    tags?: IDriveTag[];

    createdBy?: number | null;
    updatedBy?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface IDriveVersion {
    id: string;
    nodeId: string;
    versionNumber: number;
    storageKey: string;
    storageBucket: string;
    sizeBytes: number;
    mimeType: string;
    originalName: string;
    checksumSha256?: string | null;
    uploadedBy: number;
    uploaderName?: string;
    comment?: string | null;
    createdAt: string;
}

export interface IDriveShare {
    id: string;
    nodeId: string;
    permission: DrivePermission;
    targetType: DriveShareTarget;
    targetUserId?: number | null;
    targetUserName?: string | null;
    sharedBy: number;
    sharedByName?: string;
    message?: string | null;
    expiresAt?: string | null;
    createdAt: string;
}

export interface IDriveActivity {
    id: string;
    action: DriveAction;
    nodeId?: string | null;
    nodeName: string;
    actorId: number;
    actorName?: string;
    targetUserId?: number | null;
    targetUserName?: string | null;
    versionId?: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface IDriveTag {
    id: number;
    name: string;
    color?: string | null;
    createdBy?: number | null;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateFolderDTO {
    name: string;
    parentNodeId?: string;
}

export interface UpdateNodeDTO {
    name?: string;
    description?: string;
    isStarred?: boolean;
}

export interface UploadFileDTO {
    parentNodeId?: string;
    description?: string;
    tagIds?: number[];
}

export interface CreateShareDTO {
    targetType: DriveShareTarget;
    targetUserId?: number;
    targetUserIds?: number[];
    permission: DrivePermission;
    message?: string;
    expiresAt?: string;
}

export interface SearchDriveDTO {
    q?: string;
    type?: DriveNodeType;
    mime?: string;
    ownerId?: number;
    tagId?: number;
    parentNodeId?: string;
    dateFrom?: string;
    dateTo?: string;
    minSize?: number;
    maxSize?: number;
    limit?: number;
    page?: number;
    sort?: 'name' | 'sizeBytes' | 'createdAt' | 'updatedAt';
    order?: 'ASC' | 'DESC';
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface DriveListResponse {
    nodes: IDriveNode[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DriveSearchResponse {
    nodes: IDriveNode[];
    total: number;
    page: number;
    totalPages: number;
}

export interface DriveDownloadUrlResponse {
    url: string;
    expiresAt: string;
    fileName: string;
}

export interface DriveStatsResponse {
    totalNodes: number;
    totalFiles: number;
    totalFolders: number;
    totalBytes: number;
    sharedWithMeCount: number;
}

// ─── Raw MinIO Browse ─────────────────────────────────────────────────────────

export interface IBrowseFolder {
    prefix: string;
    name: string;
}

export interface IBrowseFile {
    key: string;
    name: string;
    sizeBytes: number;
    lastModified: string;
    etag: string;
    canDelete: boolean;
    driveNodeId: string | null;
    source: 'user' | 'system';
}

export interface IBrowseStorageResult {
    prefix: string;
    folders: IBrowseFolder[];
    files: IBrowseFile[];
}
