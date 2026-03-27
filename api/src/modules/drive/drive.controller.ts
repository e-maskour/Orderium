import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ApiRes } from '../../common/api-response';
import { DRV } from '../../common/response-codes';
import { DriveService } from './drive.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { MoveNodeDto } from './dto/move-node.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { SearchDriveDto } from './dto/search-drive.dto';

@ApiTags('Drive')
@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  // ──────────────────────────────────────────────────────────────────────────
  //  Stats
  // ──────────────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get drive statistics' })
  @ApiResponse({ status: 200, description: 'Drive statistics retrieved' })
  async getStats(@Request() req: any) {
    const data = await this.driveService.getStats(
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.STATS, data);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Search
  // ──────────────────────────────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search drive nodes' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async search(@Query() dto: SearchDriveDto, @Request() req: any) {
    const { nodes, total } = await this.driveService.search(
      dto,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.SEARCH_RESULTS, nodes, {
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 50,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Raw MinIO Browser
  // ──────────────────────────────────────────────────────────────────────────

  @Get('browse')
  @ApiOperation({ summary: 'Browse raw MinIO storage at a given prefix' })
  @ApiResponse({ status: 200, description: 'Storage contents listed' })
  async browseStorage(@Query('prefix') prefix = '') {
    const data = await this.driveService.browseStorage(prefix);
    return ApiRes(DRV.BROWSE_LISTED, data);
  }

  @Get('raw-url')
  @ApiOperation({ summary: 'Get a presigned download URL for a raw storage key' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  async getRawUrl(@Query('key') key: string) {
    const data = await this.driveService.getRawPresignedUrl(key);
    return ApiRes(DRV.RAW_URL, data);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Trash
  // ──────────────────────────────────────────────────────────────────────────

  @Get('trash')
  @ApiOperation({ summary: 'List trash items' })
  @ApiResponse({ status: 200, description: 'Trash items retrieved' })
  async listTrash(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const p = parseInt(page, 10) || 1;
    const l = Math.min(parseInt(limit, 10) || 50, 200);
    const { nodes, total } = await this.driveService.listTrash(
      req.user.id,
      req.user.isAdmin,
      p,
      l,
    );
    return ApiRes(DRV.TRASH_LISTED, nodes, { total, page: p, limit: l });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Shared with me
  // ──────────────────────────────────────────────────────────────────────────

  @Get('shared-with-me')
  @ApiOperation({ summary: 'Get shared with me items' })
  @ApiResponse({ status: 200, description: 'Shared items retrieved' })
  async sharedWithMe(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const p = parseInt(page, 10) || 1;
    const l = Math.min(parseInt(limit, 10) || 50, 200);
    const { nodes, total } = await this.driveService.listSharedWithMe(
      req.user.id,
      p,
      l,
    );
    return ApiRes(DRV.SHARED_WITH_ME, nodes, { total, page: p, limit: l });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Tags
  // ──────────────────────────────────────────────────────────────────────────

  @Get('tags')
  @ApiOperation({ summary: 'List available tags' })
  @ApiResponse({ status: 200, description: 'Tags retrieved' })
  async listTags() {
    const tags = await this.driveService.listTags();
    return ApiRes(DRV.TAGS_LISTED, tags);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Root & children
  // ──────────────────────────────────────────────────────────────────────────

  @Get('nodes')
  @ApiOperation({ summary: 'List root nodes' })
  @ApiResponse({ status: 200, description: 'Root nodes retrieved' })
  async listRoot(@Request() req: any) {
    const { nodes, total } = await this.driveService.listRoot(
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODES_LISTED, nodes, { total });
  }

  @Get('nodes/:id/children')
  @ApiOperation({ summary: 'List node children' })
  @ApiResponse({ status: 200, description: 'Child nodes retrieved' })
  async listChildren(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const { nodes, total } = await this.driveService.listChildren(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODES_LISTED, nodes, { total });
  }

  @Get('nodes/:id/shares')
  @ApiOperation({ summary: 'List node shares' })
  @ApiResponse({ status: 200, description: 'Shares retrieved' })
  async listShares(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const shares = await this.driveService.listShares(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.SHARES_LISTED, shares);
  }

  @Get('nodes/:id/activity')
  @ApiOperation({ summary: 'List node activity' })
  @ApiResponse({ status: 200, description: 'Activity retrieved' })
  async listActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const { activities, total } = await this.driveService.listActivity(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.ACTIVITY_LISTED, activities, { total });
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get node details' })
  @ApiResponse({ status: 200, description: 'Node retrieved' })
  async getNode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const node = await this.driveService.getNode(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODE_DETAIL, node);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Folder creation
  // ──────────────────────────────────────────────────────────────────────────

  @Post('folders')
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  async createFolder(@Body() dto: CreateFolderDto, @Request() req: any) {
    const node = await this.driveService.createFolder(dto, req.user.id);
    return ApiRes(DRV.FOLDER_CREATED, node);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  File upload
  // ──────────────────────────────────────────────────────────────────────────

  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('parentNodeId') parentNodeId: string | undefined,
    @Request() req: any,
  ) {
    const node = await this.driveService.uploadFile(
      file,
      parentNodeId,
      req.user.id,
    );
    return ApiRes(DRV.FILE_UPLOADED, node);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Node mutation
  // ──────────────────────────────────────────────────────────────────────────

  @Patch('nodes/:id')
  @ApiOperation({ summary: 'Update node' })
  @ApiResponse({ status: 200, description: 'Node updated' })
  async updateNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNodeDto,
    @Request() req: any,
  ) {
    const node = await this.driveService.updateNode(
      id,
      dto,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODE_UPDATED, node);
  }

  @Patch('nodes/:id/move')
  @ApiOperation({ summary: 'Move node' })
  @ApiResponse({ status: 200, description: 'Node moved' })
  async moveNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveNodeDto,
    @Request() req: any,
  ) {
    const node = await this.driveService.moveNode(
      id,
      dto,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODE_MOVED, node);
  }

  @Delete('nodes/:id')
  @ApiOperation({ summary: 'Move node to trash' })
  @ApiResponse({ status: 200, description: 'Node trashed' })
  async trashNode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    await this.driveService.trashNode(id, req.user.id, req.user.isAdmin);
    return ApiRes(DRV.NODE_TRASHED, null);
  }

  @Post('nodes/:id/restore')
  @ApiOperation({ summary: 'Restore node from trash' })
  @ApiResponse({ status: 200, description: 'Node restored' })
  async restoreNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const node = await this.driveService.restoreNode(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.NODE_RESTORED, node);
  }

  @Delete('nodes/:id/permanent')
  @ApiOperation({ summary: 'Permanently delete node' })
  @ApiResponse({ status: 200, description: 'Node deleted' })
  async permanentDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.driveService.permanentDelete(id, req.user.id, req.user.isAdmin);
    return ApiRes(DRV.NODE_DELETED, null);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Shares mutation
  // ──────────────────────────────────────────────────────────────────────────

  @Post('nodes/:id/shares')
  @ApiOperation({ summary: 'Create share for node' })
  @ApiResponse({ status: 201, description: 'Share created' })
  async createShare(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateShareDto,
    @Request() req: any,
  ) {
    const share = await this.driveService.createShare(
      id,
      dto,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.SHARE_CREATED, share);
  }

  @Patch('nodes/:id/shares/:shareId')
  @ApiOperation({ summary: 'Update share' })
  @ApiResponse({ status: 200, description: 'Share updated' })
  async updateShare(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Body() dto: Partial<CreateShareDto>,
    @Request() req: any,
  ) {
    const share = await this.driveService.updateShare(
      id,
      shareId,
      dto,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.SHARE_UPDATED, share);
  }

  @Delete('nodes/:id/shares/:shareId')
  @ApiOperation({ summary: 'Revoke share' })
  @ApiResponse({ status: 200, description: 'Share revoked' })
  async revokeShare(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Request() req: any,
  ) {
    await this.driveService.revokeShare(
      id,
      shareId,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.SHARE_REVOKED, null);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  File operations
  // ──────────────────────────────────────────────────────────────────────────

  @Put('files/:id/replace')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Replace file' })
  @ApiResponse({ status: 200, description: 'File replaced' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async replaceFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const version = await this.driveService.replaceFile(
      id,
      file,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.FILE_REPLACED, version);
  }

  @Get('files/:id/download')
  @ApiOperation({ summary: 'Get file download URL' })
  @ApiResponse({ status: 200, description: 'Download URL generated' })
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const url = await this.driveService.getDownloadUrl(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.DOWNLOAD_URL, { url });
  }

  @Get('files/:id/versions')
  @ApiOperation({ summary: 'List file versions' })
  @ApiResponse({ status: 200, description: 'File versions retrieved' })
  async listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const { versions, total } = await this.driveService.listVersions(
      id,
      req.user.id,
      req.user.isAdmin,
    );
    return ApiRes(DRV.VERSIONS_LISTED, versions, { total });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Tags mutation
  // ──────────────────────────────────────────────────────────────────────────

  @Post('nodes/:id/tags/:tagId')
  @ApiOperation({ summary: 'Add tag to node' })
  @ApiResponse({ status: 200, description: 'Tag added' })
  async addTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseIntPipe) tagId: number,
    @Request() req: any,
  ) {
    await this.driveService.addTag(id, tagId, req.user.id, req.user.isAdmin);
    return ApiRes(DRV.TAG_ADDED, null);
  }

  @Delete('nodes/:id/tags/:tagId')
  @ApiOperation({ summary: 'Remove tag from node' })
  @ApiResponse({ status: 200, description: 'Tag removed' })
  async removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseIntPipe) tagId: number,
    @Request() req: any,
  ) {
    await this.driveService.removeTag(id, tagId, req.user.id, req.user.isAdmin);
    return ApiRes(DRV.TAG_REMOVED, null);
  }
}
