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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { ApiRes } from '../../common/api-response';
import { ROLE } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Roles')
@Serialize(RoleResponseDto)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @RequirePermission('roles.view')
  async findAll() {
    const data = await this.rolesService.findAll();
    return ApiRes(ROLE.LIST, data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequirePermission('roles.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.rolesService.findOne(id);
    return ApiRes(ROLE.DETAIL, data);
  }

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role data' })
  @RequirePermission('roles.create')
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return ApiRes(ROLE.CREATED, data);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default roles' })
  @ApiResponse({
    status: 200,
    description: 'Default roles seeded successfully',
  })
  @RequirePermission('roles.edit')
  async seed() {
    const data = await this.rolesService.seedDefaults();
    return ApiRes(ROLE.SEEDED, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequirePermission('roles.edit')
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
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequirePermission('roles.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rolesService.remove(id);
    return ApiRes(ROLE.DELETED, null);
  }
}
