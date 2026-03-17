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
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { SuperAdminGuard } from './tenant.guard';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Super-admin API for managing tenants.
 *
 * ALL endpoints require the `X-Super-Admin-Key` header (see SuperAdminGuard).
 * The global JwtAuthGuard is bypassed via @Public() because these endpoints
 * use their own authentication mechanism.
 *
 * These routes are EXCLUDED from TenantMiddleware (see AppModule configuration).
 */
@Controller('admin/tenants')
@UseGuards(SuperAdminGuard)
@Public()
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  /**
   * GET /api/admin/tenants
   * List all tenants with optional search, status/plan filters, sort and pagination.
   */
  @Get()
  findAll(@Query() dto: ListTenantsDto) {
    return this.tenantService.findAll(dto);
  }

  /**
   * GET /api/admin/tenants/:id
   * Get a single tenant by primary key.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.findOne(id);
  }

  /**
   * GET /api/admin/tenants/:id/activity
   * Retrieve the activity log for a tenant.
   */
  @Get(':id/activity')
  getActivity(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getActivity(id);
  }

  /**
   * GET /api/admin/tenants/:id/payments
   * Retrieve payments for a tenant.
   */
  @Get(':id/payments')
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getPayments(id);
  }

  /**
   * GET /api/admin/tenants/:id/stats
   * Retrieve DB size, user count, order count, and MinIO storage usage.
   */
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.getStats(id);
  }

  /**
   * POST /api/admin/tenants
   * Create a new tenant: provisions Postgres DB, MinIO bucket, Redis keys.
   */
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  /**
   * POST /api/admin/tenants/:id/reset
   * DANGEROUS — drops and re-provisions the tenant database.
   * Body must include { confirmation: "RESET" }.
   */
  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  resetData(
    @Param('id', ParseIntPipe) id: number,
    @Body('confirmation') confirmation: string,
  ) {
    return this.tenantService.resetData(id, confirmation);
  }

  /**
   * PATCH /api/admin/tenants/:id
   * Update tenant profile fields (name, logo, colors, contact info, plan, etc.).
   */
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  /**
   * PATCH /api/admin/tenants/:id/activate
   * Re-activate a previously disabled tenant.
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.activate(id);
  }

  /**
   * PATCH /api/admin/tenants/:id/disable
   * Disable a tenant (isActive=false, sets disabledAt, updates Redis).
   */
  @Patch(':id/disable')
  @HttpCode(HttpStatus.OK)
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.disable(id);
  }

  /**
   * DELETE /api/admin/tenants/:id
   * Soft-delete a tenant (sets deletedAt, evicts from cache, clears Redis keys).
   * The database and MinIO bucket are NOT deleted — data is retained.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.softDelete(id);
  }
}
