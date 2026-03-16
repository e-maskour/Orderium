import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DriveNode } from './entities/drive-node.entity';
import { DriveVersion } from './entities/drive-version.entity';
import { DriveShare } from './entities/drive-share.entity';
import { DriveActivity } from './entities/drive-activity.entity';
import { DriveTag } from './entities/drive-tag.entity';
import { DriveNodeTag } from './entities/drive-node-tag.entity';
import { DriveNodeType } from './enums/drive-node-type.enum';
import { DriveAction } from './enums/drive-action.enum';
import { DriveShareTarget } from './enums/drive-share-target.enum';
import { DriveStorageService } from './drive-storage.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { MoveNodeDto } from './dto/move-node.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { SearchDriveDto } from './dto/search-drive.dto';
import { DrivePermission } from './enums/drive-permission.enum';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    @InjectRepository(DriveNode)
    private readonly nodeRepo: Repository<DriveNode>,
    @InjectRepository(DriveVersion)
    private readonly versionRepo: Repository<DriveVersion>,
    @InjectRepository(DriveShare)
    private readonly shareRepo: Repository<DriveShare>,
    @InjectRepository(DriveActivity)
    private readonly activityRepo: Repository<DriveActivity>,
    @InjectRepository(DriveTag)
    private readonly tagRepo: Repository<DriveTag>,
    @InjectRepository(DriveNodeTag)
    private readonly nodeTagRepo: Repository<DriveNodeTag>,
    private readonly storage: DriveStorageService,
  ) { }

  // ──────────────────────────────────────────────────────────────────────────
  //  Access guards helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async requireNode(id: string): Promise<DriveNode> {
    const node = await this.nodeRepo.findOne({ where: { id } });
    if (!node) throw new NotFoundException(`Drive node ${id} not found`);
    return node;
  }

  private async canRead(
    node: DriveNode,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    if (isAdmin || node.ownerId === userId) return true;
    const share = await this.shareRepo.findOne({
      where: [
        { nodeId: node.id, targetType: DriveShareTarget.EVERYONE },
        {
          nodeId: node.id,
          targetType: DriveShareTarget.USER,
          targetUserId: userId,
        },
      ],
    });
    if (share) {
      if (share.expiresAt && share.expiresAt < new Date()) return false;
      return true;
    }
    return false;
  }

  private async canWrite(
    node: DriveNode,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    if (isAdmin || node.ownerId === userId) return true;
    const share = await this.shareRepo.findOne({
      where: [
        { nodeId: node.id, targetType: DriveShareTarget.EVERYONE },
        {
          nodeId: node.id,
          targetType: DriveShareTarget.USER,
          targetUserId: userId,
        },
      ],
    });
    if (share && share.permission === DrivePermission.EDITOR) {
      if (share.expiresAt && share.expiresAt < new Date()) return false;
      return true;
    }
    return false;
  }

  private async logActivity(
    action: DriveAction,
    node: DriveNode,
    actorId: number,
    extra?: Partial<DriveActivity>,
  ): Promise<void> {
    try {
      await this.activityRepo.save(
        this.activityRepo.create({
          action,
          nodeId: node.id,
          nodeName: node.name,
          actorId,
          ...extra,
        }),
      );
    } catch (err) {
      this.logger.warn('Activity log failed', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Listing
  // ──────────────────────────────────────────────────────────────────────────

  async listRoot(
    userId: number,
    isAdmin: boolean,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const where = isAdmin
      ? { parentId: IsNull(), isTrashed: false }
      : { parentId: IsNull(), isTrashed: false, ownerId: userId };
    const [nodes] = await this.nodeRepo.findAndCount({
      where,
      order: { type: 'ASC', name: 'ASC' },
    });
    // Include shared-with-me at root if not admin
    if (!isAdmin) {
      const sharedNodeIds = await this.shareRepo
        .createQueryBuilder('s')
        .select('s.node_id', 'nodeId')
        .where('s.target_type = :tt', { tt: DriveShareTarget.USER })
        .andWhere('s.target_user_id = :uid', { uid: userId })
        .andWhere('(s.expires_at IS NULL OR s.expires_at > NOW())')
        .getRawMany<{ nodeId: string }>();
      if (sharedNodeIds.length > 0) {
        const ids = sharedNodeIds.map((r) => r.nodeId);
        const sharedNodes = await this.nodeRepo
          .createQueryBuilder('n')
          .where('n.id IN (:...ids)', { ids })
          .andWhere('n.parent_id IS NULL')
          .andWhere('n.is_trashed = false')
          .getMany();
        nodes.push(
          ...sharedNodes.filter((sn) => !nodes.some((n) => n.id === sn.id)),
        );
      }
    }
    return { nodes, total: nodes.length };
  }

  async listChildren(
    parentId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const parent = await this.requireNode(parentId);
    if (!(await this.canRead(parent, userId, isAdmin))) {
      throw new ForbiddenException('No access to this folder');
    }
    const [nodes, total] = await this.nodeRepo.findAndCount({
      where: { parentId, isTrashed: false },
      order: { type: 'ASC', name: 'ASC' },
    });
    return { nodes, total };
  }

  async getNode(
    id: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveNode> {
    const node = await this.requireNode(id);
    if (!(await this.canRead(node, userId, isAdmin))) {
      throw new ForbiddenException('No access to this node');
    }
    return node;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Folder creation
  // ──────────────────────────────────────────────────────────────────────────

  async createFolder(dto: CreateFolderDto, userId: number): Promise<DriveNode> {
    if (dto.parentNodeId) {
      const parent = await this.requireNode(dto.parentNodeId);
      if (parent.type !== DriveNodeType.FOLDER)
        throw new ForbiddenException('Parent must be a folder');
      if (parent.ownerId !== userId) {
        const share = await this.shareRepo.findOne({
          where: { nodeId: parent.id, targetUserId: userId },
        });
        if (!share || share.permission === DrivePermission.VIEWER)
          throw new ForbiddenException('No write access to this folder');
      }
    }
    const folder = this.nodeRepo.create({
      type: DriveNodeType.FOLDER,
      name: dto.name.trim(),
      parentId: dto.parentNodeId ?? null,
      ownerId: userId,
      createdBy: userId,
      updatedBy: userId,
    });
    const saved = await this.nodeRepo.save(folder);
    await this.logActivity(DriveAction.CREATE_FOLDER, saved, userId);
    return saved;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  File upload
  // ──────────────────────────────────────────────────────────────────────────

  async uploadFile(
    file: Express.Multer.File,
    parentNodeId: string | undefined,
    userId: number,
  ): Promise<DriveNode> {
    if (parentNodeId) {
      const parent = await this.requireNode(parentNodeId);
      if (parent.type !== DriveNodeType.FOLDER)
        throw new ForbiddenException('Parent must be a folder');
    }
    const folder = parentNodeId ?? 'files';
    const upload = await this.storage.uploadFile(file, folder);
    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!.toLowerCase()
      : null;

    const node = this.nodeRepo.create({
      type: DriveNodeType.FILE,
      name: file.originalname,
      parentId: parentNodeId ?? null,
      ownerId: userId,
      mimeType: file.mimetype,
      extension: ext,
      sizeBytes: upload.sizeBytes,
      storageKey: upload.storageKey,
      storageBucket: upload.storageBucket,
      createdBy: userId,
      updatedBy: userId,
    });
    const savedNode = await this.nodeRepo.save(node);

    // Create first version
    const version = this.versionRepo.create({
      nodeId: savedNode.id,
      versionNumber: 1,
      storageKey: upload.storageKey,
      storageBucket: upload.storageBucket,
      sizeBytes: upload.sizeBytes,
      mimeType: file.mimetype,
      originalName: file.originalname,
      checksumSha256: upload.checksumSha256 ?? null,
      uploadedBy: userId,
    });
    const savedVersion = await this.versionRepo.save(version);
    await this.nodeRepo.update(savedNode.id, {
      activeVersionId: savedVersion.id,
    });
    savedNode.activeVersionId = savedVersion.id;

    await this.logActivity(DriveAction.UPLOAD, savedNode, userId);
    return savedNode;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  File replacement (new version)
  // ──────────────────────────────────────────────────────────────────────────

  async replaceFile(
    nodeId: string,
    file: Express.Multer.File,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveVersion> {
    const node = await this.requireNode(nodeId);
    if (node.type !== DriveNodeType.FILE)
      throw new ForbiddenException('Node is not a file');
    if (!(await this.canWrite(node, userId, isAdmin)))
      throw new ForbiddenException('No write access');

    const upload = await this.storage.uploadFile(
      file,
      node.parentId ?? 'files',
    );
    const latestVersion = await this.versionRepo.findOne({
      where: { nodeId },
      order: { versionNumber: 'DESC' },
    });
    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const version = this.versionRepo.create({
      nodeId,
      versionNumber: nextVersionNumber,
      storageKey: upload.storageKey,
      storageBucket: upload.storageBucket,
      sizeBytes: upload.sizeBytes,
      mimeType: file.mimetype,
      originalName: file.originalname,
      checksumSha256: upload.checksumSha256 ?? null,
      uploadedBy: userId,
    });
    const savedVersion = await this.versionRepo.save(version);

    await this.nodeRepo.update(nodeId, {
      storageKey: upload.storageKey,
      storageBucket: upload.storageBucket,
      sizeBytes: upload.sizeBytes,
      mimeType: file.mimetype,
      activeVersionId: savedVersion.id,
      updatedBy: userId,
    });
    await this.logActivity(DriveAction.REPLACE, node, userId, {
      versionId: savedVersion.id,
    });
    return savedVersion;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Download URL
  // ──────────────────────────────────────────────────────────────────────────

  async getDownloadUrl(
    nodeId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<string> {
    const node = await this.requireNode(nodeId);
    if (node.type !== DriveNodeType.FILE)
      throw new ForbiddenException('Node is not a file');
    if (!(await this.canRead(node, userId, isAdmin)))
      throw new ForbiddenException('No access to this file');
    if (!node.storageKey) throw new NotFoundException('File not stored yet');
    const url = await this.storage.getPresignedDownloadUrl(node.storageKey);
    await this.logActivity(DriveAction.DOWNLOAD, node, userId);
    return url;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Versions
  // ──────────────────────────────────────────────────────────────────────────

  async listVersions(
    nodeId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<{ versions: DriveVersion[]; total: number }> {
    const node = await this.requireNode(nodeId);
    if (node.type !== DriveNodeType.FILE)
      throw new ForbiddenException('Node is not a file');
    if (!(await this.canRead(node, userId, isAdmin)))
      throw new ForbiddenException('No access');
    const [versions, total] = await this.versionRepo.findAndCount({
      where: { nodeId },
      order: { versionNumber: 'DESC' },
    });
    return { versions, total };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Update node (rename, star, description)
  // ──────────────────────────────────────────────────────────────────────────

  async updateNode(
    id: string,
    dto: UpdateNodeDto,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveNode> {
    const node = await this.requireNode(id);
    if (!(await this.canWrite(node, userId, isAdmin)))
      throw new ForbiddenException('No write access');
    const updates: {
      updatedBy: number;
      name?: string;
      description?: string;
      isStarred?: boolean;
    } = { updatedBy: userId };
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.isStarred !== undefined) updates.isStarred = dto.isStarred;
    await this.nodeRepo.update(id, updates);
    if (dto.name && dto.name !== node.name) {
      await this.logActivity(DriveAction.RENAME, node, userId, {
        metadata: { oldName: node.name, newName: dto.name },
      });
    }
    return this.nodeRepo.findOneOrFail({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Move
  // ──────────────────────────────────────────────────────────────────────────

  async moveNode(
    id: string,
    dto: MoveNodeDto,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveNode> {
    const node = await this.requireNode(id);
    if (!(await this.canWrite(node, userId, isAdmin)))
      throw new ForbiddenException('No write access');
    if (dto.newParentId) {
      const newParent = await this.requireNode(dto.newParentId);
      if (newParent.type !== DriveNodeType.FOLDER)
        throw new ForbiddenException('Target must be a folder');
      if (newParent.id === id)
        throw new ForbiddenException('Cannot move folder into itself');
    }
    await this.nodeRepo.update(id, {
      parentId: dto.newParentId ?? null,
      updatedBy: userId,
    });
    await this.logActivity(DriveAction.MOVE, node, userId, {
      metadata: { from: node.parentId, to: dto.newParentId ?? null },
    });
    return this.nodeRepo.findOneOrFail({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Trash
  // ──────────────────────────────────────────────────────────────────────────

  async trashNode(id: string, userId: number, isAdmin: boolean): Promise<void> {
    const node = await this.requireNode(id);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can trash this node');
    await this.nodeRepo.update(id, {
      isTrashed: true,
      trashedAt: new Date(),
      updatedBy: userId,
    });
    await this.logActivity(DriveAction.TRASH, node, userId);
  }

  async restoreNode(
    id: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveNode> {
    const node = await this.requireNode(id);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can restore this node');
    await this.nodeRepo.update(id, {
      isTrashed: false,
      trashedAt: null,
      updatedBy: userId,
    });
    await this.logActivity(DriveAction.RESTORE, node, userId);
    return this.nodeRepo.findOneOrFail({ where: { id } });
  }

  async listTrash(
    userId: number,
    isAdmin: boolean,
    page = 1,
    limit = 50,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const where = isAdmin
      ? { isTrashed: true }
      : { isTrashed: true, ownerId: userId };
    const [nodes, total] = await this.nodeRepo.findAndCount({
      where,
      order: { trashedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { nodes, total };
  }

  async permanentDelete(
    id: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const node = await this.requireNode(id);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can delete this node');
    if (!node.isTrashed)
      throw new ForbiddenException(
        'Node must be trashed before permanent deletion',
      );
    // Delete storage files
    if (node.storageKey) {
      await this.storage
        .deleteFile(node.storageKey)
        .catch((err) =>
          this.logger.warn(`Storage delete skipped: ${err.message}`),
        );
    }
    // Cascade deletion handles DB children
    await this.nodeRepo.remove(node);
    await this.logActivity(DriveAction.PERMANENT_DELETE, node, userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Shares
  // ──────────────────────────────────────────────────────────────────────────

  async listShares(
    nodeId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveShare[]> {
    const node = await this.requireNode(nodeId);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can view shares');
    return this.shareRepo.find({
      where: { nodeId },
      order: { createdAt: 'DESC' },
    });
  }

  async createShare(
    nodeId: string,
    dto: CreateShareDto,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveShare> {
    const node = await this.requireNode(nodeId);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can share this node');
    const share = this.shareRepo.create({
      nodeId,
      targetType: dto.targetType,
      targetUserId: dto.targetUserId ?? null,
      permission: dto.permission,
      sharedBy: userId,
      message: dto.message ?? null,
      expiresAt: dto.expiresAt ?? null,
    });
    const saved = await this.shareRepo.save(share);
    await this.logActivity(DriveAction.SHARE, node, userId, {
      targetUserId: dto.targetUserId,
    });
    return saved;
  }

  async updateShare(
    nodeId: string,
    shareId: string,
    dto: Partial<CreateShareDto>,
    userId: number,
    isAdmin: boolean,
  ): Promise<DriveShare> {
    const node = await this.requireNode(nodeId);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can update shares');
    const share = await this.shareRepo.findOne({
      where: { id: shareId, nodeId },
    });
    if (!share) throw new NotFoundException(`Share ${shareId} not found`);
    Object.assign(share, dto);
    return this.shareRepo.save(share);
  }

  async revokeShare(
    nodeId: string,
    shareId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const node = await this.requireNode(nodeId);
    if (!isAdmin && node.ownerId !== userId)
      throw new ForbiddenException('Only the owner can revoke shares');
    const share = await this.shareRepo.findOne({
      where: { id: shareId, nodeId },
    });
    if (!share) throw new NotFoundException(`Share ${shareId} not found`);
    await this.shareRepo.remove(share);
    await this.logActivity(DriveAction.UNSHARE, node, userId);
  }

  async listSharedWithMe(
    userId: number,
    page = 1,
    limit = 50,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const shareQb = this.shareRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.node_id', 'nodeId')
      .where('s.target_type = :tt', { tt: DriveShareTarget.USER })
      .andWhere('s.target_user_id = :uid', { uid: userId })
      .andWhere('(s.expires_at IS NULL OR s.expires_at > NOW())');

    const nodeIds = (await shareQb.getRawMany<{ nodeId: string }>()).map(
      (r) => r.nodeId,
    );
    if (!nodeIds.length) return { nodes: [], total: 0 };

    const [nodes, total] = await this.nodeRepo.findAndCount({
      where: nodeIds.map((id) => ({ id, isTrashed: false })),
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { nodes, total };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Search
  // ──────────────────────────────────────────────────────────────────────────

  async search(
    dto: SearchDriveDto,
    userId: number,
    isAdmin: boolean,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const limit = dto.limit ?? 50;
    const page = dto.page ?? 1;
    const sort = dto.sort ?? 'createdAt';
    const order = dto.order ?? 'DESC';

    const qb = this.nodeRepo
      .createQueryBuilder('n')
      .where('n.is_trashed = false');
    if (!isAdmin) qb.andWhere('n.owner_id = :uid', { uid: userId });
    if (dto.q) qb.andWhere('n.name ILIKE :q', { q: `%${dto.q}%` });
    if (dto.type) qb.andWhere('n.type = :type', { type: dto.type });
    if (dto.mimeType)
      qb.andWhere('n.mime_type ILIKE :mt', { mt: `%${dto.mimeType}%` });
    if (dto.tagId) {
      qb.innerJoin('n.nodeTags', 'nt', 'nt.tag_id = :tagId', {
        tagId: dto.tagId,
      });
    }
    qb.orderBy(`n.${sort}`, order);
    qb.skip((page - 1) * limit).take(limit);
    const [nodes, total] = await qb.getManyAndCount();
    return { nodes, total };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Activity
  // ──────────────────────────────────────────────────────────────────────────

  async listActivity(
    nodeId: string,
    userId: number,
    isAdmin: boolean,
  ): Promise<{ activities: DriveActivity[]; total: number }> {
    const node = await this.requireNode(nodeId);
    if (!(await this.canRead(node, userId, isAdmin)))
      throw new ForbiddenException('No access');
    const [activities, total] = await this.activityRepo.findAndCount({
      where: { nodeId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { activities, total };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Tags
  // ──────────────────────────────────────────────────────────────────────────

  async listTags(): Promise<DriveTag[]> {
    return this.tagRepo.find({ order: { name: 'ASC' } });
  }

  async addTag(
    nodeId: string,
    tagId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const node = await this.requireNode(nodeId);
    if (!(await this.canWrite(node, userId, isAdmin)))
      throw new ForbiddenException('No write access');
    const tag = await this.tagRepo.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException(`Tag ${tagId} not found`);
    const exists = await this.nodeTagRepo.findOne({ where: { nodeId, tagId } });
    if (!exists) {
      await this.nodeTagRepo.save(this.nodeTagRepo.create({ nodeId, tagId }));
    }
  }

  async removeTag(
    nodeId: string,
    tagId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const node = await this.requireNode(nodeId);
    if (!(await this.canWrite(node, userId, isAdmin)))
      throw new ForbiddenException('No write access');
    await this.nodeTagRepo.delete({ nodeId, tagId });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Stats
  // ──────────────────────────────────────────────────────────────────────────

  async getStats(
    userId: number,
    isAdmin: boolean,
  ): Promise<{
    totalNodes: number;
    totalFiles: number;
    totalFolders: number;
    totalSizeBytes: number;
    trashedNodes: number;
    sharedByMe: number;
    sharedWithMe: number;
  }> {
    const ownerCondition = isAdmin ? {} : { ownerId: userId };

    const [totalNodes, totalFiles, totalFolders, trashedNodes] =
      await Promise.all([
        this.nodeRepo.count({ where: { ...ownerCondition, isTrashed: false } }),
        this.nodeRepo.count({
          where: {
            ...ownerCondition,
            type: DriveNodeType.FILE,
            isTrashed: false,
          },
        }),
        this.nodeRepo.count({
          where: {
            ...ownerCondition,
            type: DriveNodeType.FOLDER,
            isTrashed: false,
          },
        }),
        this.nodeRepo.count({ where: { ...ownerCondition, isTrashed: true } }),
      ]);

    const sizeResult = await this.nodeRepo
      .createQueryBuilder('n')
      .select('SUM(n.size_bytes)', 'total')
      .where('n.is_trashed = false')
      .andWhere('n.type = :t', { t: DriveNodeType.FILE })
      .andWhere(isAdmin ? '1=1' : 'n.owner_id = :uid', { uid: userId })
      .getRawOne<{ total: string }>();

    const totalSizeBytes = parseInt(sizeResult?.total ?? '0', 10) || 0;

    const sharedByMe = await this.shareRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.node_id)', 'cnt')
      .where('s.shared_by = :uid', { uid: userId })
      .getRawOne<{ cnt: string }>();

    const sharedWithMeResult = await this.shareRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.node_id)', 'cnt')
      .where('s.target_type = :tt', { tt: DriveShareTarget.USER })
      .andWhere('s.target_user_id = :uid', { uid: userId })
      .andWhere('(s.expires_at IS NULL OR s.expires_at > NOW())')
      .getRawOne<{ cnt: string }>();

    return {
      totalNodes,
      totalFiles,
      totalFolders,
      totalSizeBytes,
      trashedNodes,
      sharedByMe: parseInt(sharedByMe?.cnt ?? '0', 10) || 0,
      sharedWithMe: parseInt(sharedWithMeResult?.cnt ?? '0', 10) || 0,
    };
  }
}
