import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BulkService } from './bulk.service';
import { ApiRes } from '../../common/api-response';
import { BULK } from '../../common/response-codes';
import { BulkExportEntity } from '../../common/queues/queue.constants';

class StartExportDto {
  supplierId?: number;
}

@ApiTags('Bulk')
@Controller('bulk')
export class BulkController {
  private readonly logger = new Logger(BulkController.name);

  constructor(private readonly bulkService: BulkService) {}

  @Post('export/orders')
  @ApiOperation({ summary: 'Enqueue async XLSX export for orders' })
  @ApiResponse({
    status: 201,
    description: 'Export job queued',
    schema: { example: { jobId: 'abc123' } },
  })
  async exportOrders(@Body() dto: StartExportDto) {
    const jobId = await this.bulkService.enqueueXlsxExport(
      'orders' as BulkExportEntity,
      dto.supplierId,
    );
    return ApiRes(BULK.EXPORT_QUEUED, { jobId });
  }

  @Post('export/invoices')
  @ApiOperation({ summary: 'Enqueue async XLSX export for invoices' })
  @ApiResponse({
    status: 201,
    description: 'Export job queued',
    schema: { example: { jobId: 'abc123' } },
  })
  async exportInvoices(@Body() dto: StartExportDto) {
    const jobId = await this.bulkService.enqueueXlsxExport(
      'invoices' as BulkExportEntity,
      dto.supplierId,
    );
    return ApiRes(BULK.EXPORT_QUEUED, { jobId });
  }

  @Post('export/products')
  @ApiOperation({ summary: 'Enqueue async XLSX export for products' })
  @ApiResponse({
    status: 201,
    description: 'Export job queued',
    schema: { example: { jobId: 'abc123' } },
  })
  async exportProducts() {
    const jobId = await this.bulkService.enqueueXlsxExport(
      'products' as BulkExportEntity,
    );
    return ApiRes(BULK.EXPORT_QUEUED, { jobId });
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Poll the status of a bulk job' })
  @ApiResponse({
    status: 200,
    description: 'Returns job status and download URL when completed',
    schema: {
      example: {
        status: 'completed',
        result: {
          downloadUrl:
            'https://minio.example.com/exports/Factures_2024-01-01.xlsx',
          filename: 'Factures_2024-01-01T00-00-00-000Z.xlsx',
        },
      },
    },
  })
  async getJobStatus(@Param('jobId') jobId: string) {
    const jobStatus = await this.bulkService.getJobStatus(jobId);
    if (jobStatus.status === 'not-found') {
      throw new NotFoundException(`Bulk job '${jobId}' not found`);
    }
    return ApiRes(BULK.JOB_STATUS, jobStatus);
  }
}
