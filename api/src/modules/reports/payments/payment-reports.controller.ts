import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { PaymentReportsService } from './payment-reports.service';
import { ReportFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Payments')
@Controller('reports/payments')
export class PaymentReportsController {
  constructor(private readonly service: PaymentReportsService) {}

  @Get('cashflow')
  @ApiOperation({ summary: 'Cashflow — daily inflows vs outflows' })
  @ApiResponse({ status: 200 })
  async getCashflow(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.PAYMENTS_CASHFLOW,
      await this.service.getCashflow(filter),
    );
  }

  @Get('by-method')
  @ApiOperation({ summary: 'Payments grouped by payment method' })
  @ApiResponse({ status: 200 })
  async getByMethod(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.PAYMENTS_BY_METHOD,
      await this.service.getByMethod(filter),
    );
  }

  @Get('in-out-flow')
  @ApiOperation({ summary: 'Encaissements vs Décaissements summary' })
  @ApiResponse({ status: 200 })
  async getInOutFlow(@Query() filter: ReportFilterDto) {
    return ApiRes(RPT.PAYMENTS_IN_OUT, await this.service.getInOutFlow(filter));
  }

  @Get('cashflow/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export cashflow as XLSX' })
  async getCashflowXlsx(
    @Query() filter: ReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getCashflowXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="cashflow.xlsx"',
    );
    res.end(buffer);
  }
}
