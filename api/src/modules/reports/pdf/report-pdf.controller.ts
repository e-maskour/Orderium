import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { ReportPdfService } from './report-pdf.service';
import { GenerateReportPdfDto } from './dto/report-pdf.dto';
import { ReportPdfFilterDto } from './dto/report-pdf-filter.dto';
import { RequireAnyPermission } from '../../auth/decorators/permissions.decorator';
import {
  REPORT_VIEW_PERMISSIONS,
  REPORT_EXPORT_PERMISSIONS,
} from '../../../common/access/access-modules';

@ApiTags('Reports — PDF')
@Controller('reports/pdf')
export class ReportPdfController {
  constructor(private readonly service: ReportPdfService) {}

  @Get()
  @ApiOperation({ summary: 'List report keys available for PDF export' })
  @ApiResponse({ status: 200, description: 'Available report keys' })
  @RequireAnyPermission(...REPORT_VIEW_PERMISSIONS)
  listAvailable() {
    return ApiRes(RPT.PDF_KEYS, { reports: this.service.availableReports() });
  }

  /**
   * Renders any analytics report as a branded PDF.
   *
   * `POST` rather than `GET` because the presentation spec (translated title,
   * column definitions) is too large for a query string. The spec carries no
   * figures — the server re-runs the report itself, unpaginated.
   */
  @Post(':reportKey')
  @ApiOperation({ summary: 'Generate a branded PDF for an analytics report' })
  @ApiParam({
    name: 'reportKey',
    example: 'sales-revenue',
    description: 'Report identifier, e.g. sales-revenue, clients-top',
  })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @RequireAnyPermission(...REPORT_EXPORT_PERMISSIONS)
  async generate(
    @Param('reportKey') reportKey: string,
    @Query() filter: ReportPdfFilterDto,
    @Body() spec: GenerateReportPdfDto,
    @Res() res: Response,
  ) {
    const report = await this.service.generate(reportKey, filter, spec);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Length', report.byteLength);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.fileName}"`,
    );
    res.end(report.buffer);
  }
}
