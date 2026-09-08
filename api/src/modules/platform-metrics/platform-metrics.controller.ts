import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { PlatformMetricsService } from './platform-metrics.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { UsageTrackerService } from './usage-tracker.service';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { PLM } from '../../common/response-codes';
import {
  TenantMetricsListDto,
  SeriesQueryDto,
  HealthQueryDto,
  MetricsRangeDto,
} from './dto/metrics-query.dto';

/**
 * Cross-tenant monitoring for the platform operator.
 *
 * Guarded by the same static super-admin key as `/admin/tenants`, and excluded
 * from TenantMiddleware in AppModule — these routes deliberately have no tenant
 * context, because they report on all of them.
 */
@ApiTags('Admin - Platform Metrics')
@Controller('admin/metrics')
@UseGuards(SuperAdminGuard)
@Public()
export class PlatformMetricsController {
  private readonly logger = new Logger(PlatformMetricsController.name);

  constructor(
    private readonly metricsService: PlatformMetricsService,
    private readonly collector: MetricsCollectorService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Platform-wide totals, trend and alerts across all tenants',
  })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  async getOverview(@Query() query: MetricsRangeDto) {
    const data = await this.metricsService.getOverview(query);
    return ApiRes(PLM.OVERVIEW, data);
  }

  @Get('tenants')
  @ApiOperation({
    summary: 'One metrics row per tenant, with quota usage and risk score',
  })
  @ApiResponse({ status: 200, description: 'Tenant metrics retrieved' })
  async listTenants(@Query() query: TenantMetricsListDto) {
    const data = await this.metricsService.listTenantMetrics(query);
    return ApiRes(PLM.TENANTS, data);
  }

  /**
   * Streams CSV directly rather than going through ApiRes — the response body
   * is a file, not an envelope.
   */
  @Get('tenants/export')
  @ApiOperation({ summary: 'Export the tenant metrics table as CSV' })
  @ApiResponse({ status: 200, description: 'CSV generated' })
  async exportTenants(
    @Query() query: TenantMetricsListDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.metricsService.exportCsv(query);
    const filename = `tenant-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Metrics for a single tenant' })
  @ApiResponse({ status: 200, description: 'Tenant metrics retrieved' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenant(@Param('id', ParseIntPipe) id: number) {
    const data = await this.metricsService.getTenantDetail(id);
    return ApiRes(PLM.TENANT_DETAIL, data);
  }

  @Get('tenants/:id/series')
  @ApiOperation({ summary: 'Daily time series for one tenant' })
  @ApiResponse({ status: 200, description: 'Series retrieved' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getSeries(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SeriesQueryDto,
  ) {
    const data = await this.metricsService.getTenantSeries(id, query);
    return ApiRes(PLM.SERIES, data);
  }

  @Get('health')
  @ApiOperation({
    summary:
      'Request volume, error rates and latency, platform-wide or per tenant',
  })
  @ApiResponse({ status: 200, description: 'Health retrieved' })
  async getHealth(@Query() query: HealthQueryDto) {
    const data = await this.metricsService.getHealth(query);
    return ApiRes(PLM.HEALTH, data);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Whether a collection run is currently in progress',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  getStatus() {
    return ApiRes(PLM.STATUS, { running: this.collector.isRunning() });
  }

  /**
   * Full sweep on demand. Rejected with 409 rather than queued if a run is
   * already active, so repeated clicks cannot multiply database load.
   */
  @Post('collect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run metrics collection across all tenants now' })
  @ApiResponse({ status: 200, description: 'Collection completed' })
  @ApiResponse({ status: 409, description: 'A run is already in progress' })
  async collectAll() {
    if (this.collector.isRunning()) {
      throw new ConflictException('A collection run is already in progress');
    }
    // Flush pending usage counters first so the snapshot and the usage columns
    // describe the same moment. A flush failure must not abort the collection,
    // but it must not disappear either.
    await this.flushQuietly();
    const data = await this.collector.collectAll();
    return ApiRes(PLM.COLLECT, data);
  }

  @Post('tenants/:id/collect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh metrics for a single tenant now' })
  @ApiResponse({ status: 200, description: 'Tenant metrics refreshed' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async collectOne(@Param('id', ParseIntPipe) id: number) {
    await this.flushQuietly();
    const data = await this.collector.collectOne(id);
    if (!data) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return ApiRes(PLM.COLLECT_ONE, data);
  }

  /**
   * Flush usage counters without letting a failure fail the request. Logged
   * rather than swallowed — a silent flush failure looks exactly like a tenant
   * with no traffic, which is the wrong conclusion to hand an operator.
   */
  private async flushQuietly(): Promise<void> {
    try {
      await this.usageTracker.flush();
    } catch (err) {
      this.logger.warn(
        `Usage flush failed before collection: ${(err as Error).message}`,
      );
    }
  }
}
