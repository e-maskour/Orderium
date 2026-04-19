import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { ClientReportsService } from './client-reports.service';
import { ReportFilterDto, AgingReportFilterDto, PartnerStatementFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Clients')
@Controller('reports/clients')
export class ClientReportsController {
  constructor(private readonly service: ClientReportsService) { }

  @Get('top')
  @ApiOperation({ summary: 'Top customers by revenue' })
  @ApiResponse({ status: 200 })
  async getTopCustomers(@Query() filter: ReportFilterDto) {
    return ApiRes(RPT.CLIENTS_TOP, await this.service.getTopCustomers(filter));
  }

  @Get('aging')
  @ApiOperation({ summary: 'Customer aging — outstanding invoices by bucket' })
  @ApiResponse({ status: 200 })
  async getCustomerAging(@Query() filter: AgingReportFilterDto) {
    return ApiRes(RPT.CLIENTS_AGING, await this.service.getCustomerAging(filter));
  }

  @Get('inactive')
  @ApiOperation({ summary: 'Inactive customers (no order in 90+ days)' })
  @ApiResponse({ status: 200 })
  async getInactiveCustomers(@Query() filter: ReportFilterDto) {
    return ApiRes(RPT.CLIENTS_INACTIVE, await this.service.getInactiveCustomers(filter));
  }

  @Get('statement')
  @ApiOperation({ summary: 'Customer account statement (ledger)' })
  @ApiResponse({ status: 200 })
  async getCustomerStatement(@Query() filter: PartnerStatementFilterDto) {
    return ApiRes(RPT.CLIENT_STATEMENT, await this.service.getCustomerStatement(filter));
  }

  @Get('top/xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({ summary: 'Export top customers as XLSX' })
  async getTopCustomersXlsx(@Query() filter: ReportFilterDto, @Res() res: Response) {
    const buffer = await this.service.getTopCustomersXlsx(filter);
    res.setHeader('Content-Disposition', 'attachment; filename="top-clients.xlsx"');
    res.end(buffer);
  }
}
