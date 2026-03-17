import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { ApiRes } from '../../common/api-response';
import { PERM } from '../../common/response-codes';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    @Get()
    @ApiOperation({ summary: 'List all permissions' })
    async findAll() {
        const data = await this.permissionsService.findAll();
        return ApiRes(PERM.LIST, data);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a permission by ID' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const data = await this.permissionsService.findOne(id);
        return ApiRes(PERM.DETAIL, data);
    }

    @Post()
    @ApiOperation({ summary: 'Create a permission' })
    async create(@Body() dto: CreatePermissionDto) {
        const data = await this.permissionsService.create(dto);
        return ApiRes(PERM.CREATED, data);
    }

    @Post('seed')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Seed default permissions' })
    async seed() {
        await this.permissionsService.seedDefaults();
        return ApiRes(PERM.SEEDED, null);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a permission' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePermissionDto,
    ) {
        const data = await this.permissionsService.update(id, dto);
        return ApiRes(PERM.UPDATED, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a permission' })
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.permissionsService.remove(id);
        return ApiRes(PERM.DELETED, null);
    }
}
