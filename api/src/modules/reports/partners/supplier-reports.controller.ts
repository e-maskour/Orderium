import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { SupplierReportsService } from './supplier-reports.service';
import { ReportFilterDto, AgingReportFilterDto, PartnerStatementFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Suppliers')
@Controller('reports/suppliers')
export class SupplierReportsController {
  constructor(private readonly service: SupplierReportsService) { }

  @Get('top')
  @ApiOperation({ summary: 'Top suppliers by total purchases' })
  @ApiResponse({ status: 200 })
  async getTopSuppliers(@Query() filter: ReportFilterDto) {
    return ApiRes(RPT.SUPPLIERS_TOP, await this.service.getTopSuppliers(filter));
  }

  @Get('aging')
  @ApiOperation({ summary: 'Supplier aging — outstanding purchase invoices by bucket' })
  @ApiResponse({ status: 200 })
  async getSupplierAging(@Query() filter: AgingReportFilterDto) {
    return ApiRes(RPT.SUPPLIERS_AGING, await this.service.getSupplierAging(filter));
  }

  @Get('statement')
  @ApiOperation({ summary: 'Supplier account statement (ledger)' })
  @ApiResponse({ status: 200 })
  async getSupplierStatement(@Query() filter: PartnerStatementFilterDto) {
    return ApiRes(RPT.SUPPLIER_STATEMENT, await this.service.getSupplierStatement(filter));
  }

  @Get('top/xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({ summary: 'Export top suppliers as XLSX' })
  async getTopSuppliersXlsx(@Query() filter: ReportFilterDto, @Res() res: Response) {
    const buffer = await this.service.getTopSuppliersXlsx(filter);
    res.setHeader('Content-Disposition', 'attachment; filename="top-fournisseurs.xlsx"');
    res.end(buffer);
  }
}
