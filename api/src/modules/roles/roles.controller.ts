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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiRes } from '../../common/api-response';
import { ROLE } from '../../common/response-codes';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @ApiOperation({ summary: 'List all roles' })
    async findAll() {
        const data = await this.rolesService.findAll();
        return ApiRes(ROLE.LIST, data);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a role by ID' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const data = await this.rolesService.findOne(id);
        return ApiRes(ROLE.DETAIL, data);
    }

    @Post()
    @ApiOperation({ summary: 'Create a role' })
    async create(@Body() dto: CreateRoleDto) {
        const data = await this.rolesService.create(dto);
        return ApiRes(ROLE.CREATED, data);
    }

    @Post('seed')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Seed default roles' })
    async seed() {
        const data = await this.rolesService.seedDefaults();
        return ApiRes(ROLE.SEEDED, data);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a role' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoleDto,
    ) {
        const data = await this.rolesService.update(id, dto);
        return ApiRes(ROLE.UPDATED, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a role' })
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.rolesService.remove(id);
        return ApiRes(ROLE.DELETED, null);
    }
}
