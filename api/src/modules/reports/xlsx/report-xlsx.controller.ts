import { Body, Controller, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GenerateReportPdfDto } from '../pdf/dto/report-pdf.dto';
import { ReportPdfFilterDto } from '../pdf/dto/report-pdf-filter.dto';
import { RequireAnyPermission } from '../../auth/decorators/permissions.decorator';
import { REPORT_EXPORT_PERMISSIONS } from '../../../common/access/access-modules';
import { ReportXlsxService } from './report-xlsx.service';
import { RequirePlanFeature } from '../../tenant/decorators/require-plan-feature.decorator';

@ApiTags('Reports — XLSX')
@RequirePlanFeature('reports')
@Controller('reports/xlsx')
export class ReportXlsxController {
  constructor(private readonly service: ReportXlsxService) {}

  /**
   * Exports any analytics report as a spreadsheet.
   *
   * Takes the same report key, filter and presentation spec as the PDF export
   * (`POST /reports/pdf/:reportKey`); the server re-runs the report unpaginated.
   * Returns a binary file, so the response is not wrapped in `ApiRes`.
   */
  @Post(':reportKey')
  @ApiOperation({ summary: 'Export an analytics report as XLSX' })
  @ApiParam({
    name: 'reportKey',
    example: 'sales-revenue',
    description: 'Report identifier, e.g. sales-revenue, clients-top',
  })
  @ApiResponse({ status: 200, description: 'XLSX file' })
  @ApiResponse({
    status: 400,
    description: 'Unknown report key or invalid spec',
  })
  @RequireAnyPermission(...REPORT_EXPORT_PERMISSIONS)
  async generate(
    @Param('reportKey') reportKey: string,
    @Query() filter: ReportPdfFilterDto,
    @Body() spec: GenerateReportPdfDto,
    @Res() res: Response,
  ) {
    const file = await this.service.generate(reportKey, filter, spec);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Length', file.buffer.byteLength);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    res.end(file.buffer);
  }
}
