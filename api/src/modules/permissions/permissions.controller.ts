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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { ApiRes } from '../../common/api-response';
import { PERM } from '../../common/response-codes';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  async findAll() {
    const data = await this.permissionsService.findAll();
    return ApiRes(PERM.LIST, data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiResponse({
    status: 200,
    description: 'Permission retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.permissionsService.findOne(id);
    return ApiRes(PERM.DETAIL, data);
  }

  @Post()
  @ApiOperation({ summary: 'Create a permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid permission data' })
  async create(@Body() dto: CreatePermissionDto) {
    const data = await this.permissionsService.create(dto);
    return ApiRes(PERM.CREATED, data);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default permissions' })
  @ApiResponse({
    status: 200,
    description: 'Default permissions seeded successfully',
  })
  async seed() {
    await this.permissionsService.seedDefaults();
    return ApiRes(PERM.SEEDED, null);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a permission' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
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
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.permissionsService.remove(id);
    return ApiRes(PERM.DELETED, null);
  }
}
