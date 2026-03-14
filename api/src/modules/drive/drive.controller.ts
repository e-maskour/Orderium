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
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
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
    constructor(private readonly driveService: DriveService) { }

    // ──────────────────────────────────────────────────────────────────────────
    //  Stats
    // ──────────────────────────────────────────────────────────────────────────

    @Get('stats')
    async getStats(@Request() req: any) {
        const data = await this.driveService.getStats(req.user.id, req.user.isAdmin);
        return ApiRes(DRV.STATS, data);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Search
    // ──────────────────────────────────────────────────────────────────────────

    @Get('search')
    async search(@Query() dto: SearchDriveDto, @Request() req: any) {
        const { nodes, total } = await this.driveService.search(dto, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.SEARCH_RESULTS, nodes, {
            total,
            page: dto.page ?? 1,
            limit: dto.limit ?? 50,
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Trash
    // ──────────────────────────────────────────────────────────────────────────

    @Get('trash')
    async listTrash(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Request() req: any,
    ) {
        const p = parseInt(page, 10) || 1;
        const l = Math.min(parseInt(limit, 10) || 50, 200);
        const { nodes, total } = await this.driveService.listTrash(req.user.id, req.user.isAdmin, p, l);
        return ApiRes(DRV.TRASH_LISTED, nodes, { total, page: p, limit: l });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Shared with me
    // ──────────────────────────────────────────────────────────────────────────

    @Get('shared-with-me')
    async sharedWithMe(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Request() req: any,
    ) {
        const p = parseInt(page, 10) || 1;
        const l = Math.min(parseInt(limit, 10) || 50, 200);
        const { nodes, total } = await this.driveService.listSharedWithMe(req.user.id, p, l);
        return ApiRes(DRV.SHARED_WITH_ME, nodes, { total, page: p, limit: l });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tags
    // ──────────────────────────────────────────────────────────────────────────

    @Get('tags')
    async listTags() {
        const tags = await this.driveService.listTags();
        return ApiRes(DRV.TAGS_LISTED, tags);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Root & children
    // ──────────────────────────────────────────────────────────────────────────

    @Get('nodes')
    async listRoot(@Request() req: any) {
        const { nodes, total } = await this.driveService.listRoot(req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODES_LISTED, nodes, { total });
    }

    @Get('nodes/:id/children')
    async listChildren(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ) {
        const { nodes, total } = await this.driveService.listChildren(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODES_LISTED, nodes, { total });
    }

    @Get('nodes/:id/shares')
    async listShares(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const shares = await this.driveService.listShares(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.SHARES_LISTED, shares);
    }

    @Get('nodes/:id/activity')
    async listActivity(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const { activities, total } = await this.driveService.listActivity(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.ACTIVITY_LISTED, activities, { total });
    }

    @Get('nodes/:id')
    async getNode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const node = await this.driveService.getNode(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_DETAIL, node);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Folder creation
    // ──────────────────────────────────────────────────────────────────────────

    @Post('folders')
    async createFolder(@Body() dto: CreateFolderDto, @Request() req: any) {
        const node = await this.driveService.createFolder(dto, req.user.id);
        return ApiRes(DRV.FOLDER_CREATED, node);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  File upload
    // ──────────────────────────────────────────────────────────────────────────

    @Post('files')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('parentNodeId') parentNodeId: string | undefined,
        @Request() req: any,
    ) {
        const node = await this.driveService.uploadFile(file, parentNodeId, req.user.id);
        return ApiRes(DRV.FILE_UPLOADED, node);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Node mutation
    // ──────────────────────────────────────────────────────────────────────────

    @Patch('nodes/:id')
    async updateNode(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateNodeDto,
        @Request() req: any,
    ) {
        const node = await this.driveService.updateNode(id, dto, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_UPDATED, node);
    }

    @Patch('nodes/:id/move')
    async moveNode(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: MoveNodeDto,
        @Request() req: any,
    ) {
        const node = await this.driveService.moveNode(id, dto, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_MOVED, node);
    }

    @Delete('nodes/:id')
    async trashNode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        await this.driveService.trashNode(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_TRASHED, null);
    }

    @Post('nodes/:id/restore')
    async restoreNode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const node = await this.driveService.restoreNode(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_RESTORED, node);
    }

    @Delete('nodes/:id/permanent')
    async permanentDelete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        await this.driveService.permanentDelete(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.NODE_DELETED, null);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Shares mutation
    // ──────────────────────────────────────────────────────────────────────────

    @Post('nodes/:id/shares')
    async createShare(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateShareDto,
        @Request() req: any,
    ) {
        const share = await this.driveService.createShare(id, dto, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.SHARE_CREATED, share);
    }

    @Patch('nodes/:id/shares/:shareId')
    async updateShare(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('shareId', ParseUUIDPipe) shareId: string,
        @Body() dto: Partial<CreateShareDto>,
        @Request() req: any,
    ) {
        const share = await this.driveService.updateShare(id, shareId, dto, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.SHARE_UPDATED, share);
    }

    @Delete('nodes/:id/shares/:shareId')
    async revokeShare(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('shareId', ParseUUIDPipe) shareId: string,
        @Request() req: any,
    ) {
        await this.driveService.revokeShare(id, shareId, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.SHARE_REVOKED, null);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  File operations
    // ──────────────────────────────────────────────────────────────────────────

    @Put('files/:id/replace')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async replaceFile(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        const version = await this.driveService.replaceFile(id, file, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.FILE_REPLACED, version);
    }

    @Get('files/:id/download')
    async getDownloadUrl(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const url = await this.driveService.getDownloadUrl(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.DOWNLOAD_URL, { url });
    }

    @Get('files/:id/versions')
    async listVersions(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const { versions, total } = await this.driveService.listVersions(id, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.VERSIONS_LISTED, versions, { total });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tags mutation
    // ──────────────────────────────────────────────────────────────────────────

    @Post('nodes/:id/tags/:tagId')
    async addTag(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('tagId', ParseIntPipe) tagId: number,
        @Request() req: any,
    ) {
        await this.driveService.addTag(id, tagId, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.TAG_ADDED, null);
    }

    @Delete('nodes/:id/tags/:tagId')
    async removeTag(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('tagId', ParseIntPipe) tagId: number,
        @Request() req: any,
    ) {
        await this.driveService.removeTag(id, tagId, req.user.id, req.user.isAdmin);
        return ApiRes(DRV.TAG_REMOVED, null);
    }
}
