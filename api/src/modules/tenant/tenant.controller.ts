import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantModulesDto } from './dto/update-tenant-modules.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { SuperAdminGuard } from './tenant.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Admin - Tenants')
@Controller('admin/tenants')
@UseGuards(SuperAdminGuard)
@Public()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({
    summary: 'List all tenants with optional filters and pagination',
  })
  @ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
  findAll(@Query() dto: ListTenantsDto) {
    return this.tenantService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.findOne(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get activity log for a tenant' })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
  })
  getActivity(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getActivity(id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payments for a tenant' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getPayments(id);
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get DB size, user count, order count and storage usage',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getStats(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new tenant (provisions DB, MinIO bucket, Redis keys)',
  })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Tenant already exists' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'DANGEROUS — drops and re-provisions the tenant database',
  })
  @ApiResponse({ status: 200, description: 'Tenant data reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid confirmation string' })
  resetData(
    @Param('id', ParseIntPipe) id: number,
    @Body('confirmation') confirmation: string,
  ) {
    return this.tenantService.resetData(id, confirmation);
  }

  @Get(':id/modules')
  @ApiOperation({ summary: 'Get module configuration for a tenant' })
  @ApiResponse({ status: 200, description: 'Module configuration retrieved' })
  getModules(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getModules(id);
  }

  @Patch(':id/modules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update module toggles and portal access for a tenant',
  })
  @ApiResponse({ status: 200, description: 'Module configuration updated' })
  updateModules(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantModulesDto,
  ) {
    return this.tenantService.updateModules(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant profile fields' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-activate a previously disabled tenant' })
  @ApiResponse({ status: 200, description: 'Tenant activated successfully' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.activate(id);
  }

  @Patch(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant disabled successfully' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.disable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a tenant (data retained, access revoked)',
  })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.softDelete(id);
  }
}
