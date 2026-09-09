import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintJobsService } from './print-jobs.service';
import { PrintJobsDispatchService } from './print-jobs.dispatch.service';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { LogPrintJobDto } from './dto/log-print-job.dto';
import { QueryPrintJobsDto } from './dto/query-print-jobs.dto';
import { ApiRes } from '../../common/api-response';
import { PJB } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Print Jobs')
@PortalRoute()
@Controller('print-jobs')
export class PrintJobsController {
  private readonly logger = new Logger(PrintJobsController.name);

  constructor(
    private readonly printJobsService: PrintJobsService,
    private readonly dispatch: PrintJobsDispatchService,
  ) {}

  /**
   * Queues a document for printing. The browser does not print it — an agent
   * in the target warehouse claims the job and drives the device.
   *
   * Returns 200 rather than 201 when the idempotency key already exists, so a
   * double-click is a no-op rather than a second receipt.
   */
  @Post()
  @ApiOperation({ summary: 'Queue a document for printing' })
  @ApiResponse({ status: 201, description: 'Print job queued' })
  @ApiResponse({ status: 200, description: 'An identical job was already queued' })
  @ApiResponse({ status: 404, description: 'No enabled printer for this document type' })
  @RequirePermission('printers.print')
  async create(
    @Body() dto: CreatePrintJobDto,
    @Request() req: { user: { id: number; sub: number } },
  ) {
    const { job, created } = await this.dispatch.enqueue(dto, req.user?.id ?? null);
    return ApiRes(created ? PJB.CREATED : PJB.DUPLICATE, job);
  }

  /**
   * Records a print that already happened in the browser.
   *
   * @deprecated retained for the browser fallback path until agents are rolled
   * out; Plan 3 removes it along with the client-side print flow.
   */
  @Post('log')
  @ApiOperation({ summary: 'Log a browser-side print attempt (legacy)' })
  @ApiResponse({ status: 201, description: 'Print job logged' })
  @RequirePermission('printers.print')
  async log(
    @Body() dto: LogPrintJobDto,
    @Request() req: { user: { id: number; sub: number } },
  ) {
    const job = await this.printJobsService.log(req.user.id, dto);
    return ApiRes(PJB.CREATED, job);
  }

  @Get()
  @ApiOperation({ summary: 'List print job history' })
  @ApiResponse({ status: 200, description: 'Print jobs retrieved' })
  @RequirePermission('printers.view')
  async findAll(@Query() query: QueryPrintJobsDto) {
    const result = await this.printJobsService.findAll(query);
    return ApiRes(PJB.LIST, result.data, {
      total: result.meta.total,
      limit: result.meta.limit,
      offset: (result.meta.page - 1) * result.meta.limit,
      hasNext: result.meta.page < result.meta.pages,
      hasPrev: result.meta.page > 1,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one print job (used to poll a print’s status)' })
  @ApiResponse({ status: 200, description: 'Print job retrieved' })
  @ApiResponse({ status: 404, description: 'Print job not found' })
  @RequirePermission('printers.view')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return ApiRes(PJB.DETAIL, await this.dispatch.findOne(id));
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Requeue a failed or cancelled job' })
  @ApiResponse({ status: 200, description: 'Print job requeued' })
  @ApiResponse({ status: 400, description: 'Job is not in a retryable state' })
  @RequirePermission('printers.print')
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return ApiRes(PJB.RETRIED, await this.dispatch.retry(id));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a job that has not reached a device' })
  @ApiResponse({ status: 200, description: 'Print job cancelled' })
  @ApiResponse({ status: 400, description: 'Job is not in a cancellable state' })
  @RequirePermission('printers.print')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return ApiRes(PJB.CANCELLED, await this.dispatch.cancel(id));
  }
}
