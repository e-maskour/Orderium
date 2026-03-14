import { apiClient, API_ROUTES } from '../../common';
import { DriveNode } from './drive.model';
import type {
    CreateFolderDTO,
    UpdateNodeDTO,
    CreateShareDTO,
    SearchDriveDTO,
    DriveListResponse,
    DriveSearchResponse,
    DriveDownloadUrlResponse,
    DriveStatsResponse,
    IDriveVersion,
    IDriveShare,
    IDriveActivity,
    IDriveTag,
} from './drive.interface';

export class DriveService {
    // ─── Nodes (folders + files) ─────────────────────────────────────────────

    async listRoot(): Promise<DriveNode[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.LIST_ROOT);
        const nodes: any[] = res.data?.nodes ?? res.data ?? [];
        return nodes.map(DriveNode.fromApiResponse);
    }

    async listChildren(nodeId: string): Promise<DriveNode[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.LIST_CHILDREN(nodeId));
        const nodes: any[] = res.data?.nodes ?? res.data ?? [];
        return nodes.map(DriveNode.fromApiResponse);
    }

    async getNode(nodeId: string): Promise<DriveNode> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.NODE_DETAIL(nodeId));
        return DriveNode.fromApiResponse(res.data);
    }

    async createFolder(dto: CreateFolderDTO): Promise<DriveNode> {
        const res = await apiClient.post<any>(API_ROUTES.DRIVE.CREATE_FOLDER, dto);
        return DriveNode.fromApiResponse(res.data);
    }

    async updateNode(nodeId: string, dto: UpdateNodeDTO): Promise<DriveNode> {
        const res = await apiClient.patch<any>(API_ROUTES.DRIVE.UPDATE_NODE(nodeId), dto);
        return DriveNode.fromApiResponse(res.data);
    }

    async trashNode(nodeId: string): Promise<void> {
        await apiClient.delete(API_ROUTES.DRIVE.DELETE_NODE(nodeId));
    }

    async restoreNode(nodeId: string): Promise<void> {
        await apiClient.post(API_ROUTES.DRIVE.RESTORE_NODE(nodeId), {});
    }

    async permanentDelete(nodeId: string): Promise<void> {
        await apiClient.delete(API_ROUTES.DRIVE.PERMANENT_DELETE(nodeId));
    }

    async moveNode(nodeId: string, newParentId: string | null): Promise<DriveNode> {
        const res = await apiClient.patch<any>(API_ROUTES.DRIVE.MOVE_NODE(nodeId), { newParentId });
        return DriveNode.fromApiResponse(res.data);
    }

    async listTrash(): Promise<DriveNode[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.TRASH);
        const nodes: any[] = res.data?.nodes ?? res.data ?? [];
        return nodes.map(DriveNode.fromApiResponse);
    }

    // ─── Files ───────────────────────────────────────────────────────────────

    async uploadFile(
        file: File,
        parentNodeId?: string,
        description?: string,
        onProgress?: (pct: number) => void,
    ): Promise<DriveNode> {
        const formData = new FormData();
        formData.append('file', file);
        if (parentNodeId) formData.append('parentNodeId', parentNodeId);
        if (description) formData.append('description', description);

        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_ROUTES.DRIVE.UPLOAD_FILE);

            const token = localStorage.getItem('adminToken');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const body = JSON.parse(xhr.responseText);
                        resolve(DriveNode.fromApiResponse(body.data ?? body));
                    } catch {
                        reject(new Error('Invalid response'));
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    }

    async replaceFile(nodeId: string, file: File, comment?: string): Promise<DriveNode> {
        const formData = new FormData();
        formData.append('file', file);
        if (comment) formData.append('comment', comment);
        const token = localStorage.getItem('adminToken') ?? '';
        const fetchRes = await fetch(API_ROUTES.DRIVE.REPLACE_FILE(nodeId), {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        const body = await fetchRes.json();
        if (!fetchRes.ok) throw new Error(body?.message ?? `Upload failed: ${fetchRes.status}`);
        return DriveNode.fromApiResponse(body.data ?? body);
    }

    // ─── Download ─────────────────────────────────────────────────────────────

    async getDownloadUrl(nodeId: string): Promise<{ url: string; expiresAt: string; fileName: string }> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.DOWNLOAD_URL(nodeId));
        return res.data;
    }

    // ─── Versions ────────────────────────────────────────────────────────────

    async listVersions(nodeId: string): Promise<IDriveVersion[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.LIST_VERSIONS(nodeId));
        return res.data?.versions ?? res.data ?? [];
    }

    async restoreVersion(nodeId: string, versionId: string): Promise<DriveNode> {
        const res = await apiClient.post<any>(
            API_ROUTES.DRIVE.RESTORE_VERSION(nodeId, versionId),
            {},
        );
        return DriveNode.fromApiResponse(res.data);
    }

    // ─── Sharing ─────────────────────────────────────────────────────────────

    async listShares(nodeId: string): Promise<IDriveShare[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.LIST_SHARES(nodeId));
        return res.data?.shares ?? res.data ?? [];
    }

    async createShare(nodeId: string, dto: CreateShareDTO): Promise<IDriveShare[]> {
        const res = await apiClient.post<any>(API_ROUTES.DRIVE.CREATE_SHARE(nodeId), dto);
        return res.data?.shares ?? [res.data];
    }

    async updateShare(nodeId: string, shareId: string, permission: string): Promise<IDriveShare> {
        const res = await apiClient.patch<any>(
            API_ROUTES.DRIVE.UPDATE_SHARE(nodeId, shareId),
            { permission },
        );
        return res.data;
    }

    async revokeShare(nodeId: string, shareId: string): Promise<void> {
        await apiClient.delete(API_ROUTES.DRIVE.REVOKE_SHARE(nodeId, shareId));
    }

    async listSharedWithMe(): Promise<DriveNode[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.SHARED_WITH_ME);
        const nodes: any[] = res.data?.nodes ?? res.data ?? [];
        return nodes.map(DriveNode.fromApiResponse);
    }

    // ─── Search ──────────────────────────────────────────────────────────────

    async search(params: SearchDriveDTO): Promise<DriveSearchResponse> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.SEARCH, { params: params as any });
        const nodes: any[] = res.data?.nodes ?? res.data ?? [];
        return {
            nodes: nodes.map(DriveNode.fromApiResponse),
            total: res.data?.total ?? nodes.length,
            page: res.data?.page ?? 1,
            totalPages: res.data?.totalPages ?? 1,
        };
    }

    // ─── Activity ────────────────────────────────────────────────────────────

    async listActivity(nodeId: string): Promise<IDriveActivity[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.NODE_ACTIVITY(nodeId));
        return res.data?.activities ?? res.data ?? [];
    }

    // ─── Tags ────────────────────────────────────────────────────────────────

    async listTags(): Promise<IDriveTag[]> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.LIST_TAGS);
        return res.data?.tags ?? res.data ?? [];
    }

    async addTag(nodeId: string, tagId: number): Promise<void> {
        await apiClient.post(API_ROUTES.DRIVE.ADD_TAG(nodeId, tagId), {});
    }

    async removeTag(nodeId: string, tagId: number): Promise<void> {
        await apiClient.delete(API_ROUTES.DRIVE.REMOVE_TAG(nodeId, tagId));
    }

    // ─── Stats ───────────────────────────────────────────────────────────────

    async getStats(): Promise<DriveStatsResponse> {
        const res = await apiClient.get<any>(API_ROUTES.DRIVE.STATS);
        return res.data;
    }
}

export const driveService = new DriveService();
