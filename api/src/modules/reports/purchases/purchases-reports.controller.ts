import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { PurchasesReportsService } from './purchases-reports.service';
import { SalesReportFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Purchases')
@Controller('reports/purchases')
export class PurchasesReportsController {
  constructor(private readonly service: PurchasesReportsService) {}

  @Get('by-period')
  @ApiOperation({ summary: 'Purchases by period' })
  @ApiResponse({ status: 200 })
  async getByPeriod(@Query() filter: SalesReportFilterDto) {
    return ApiRes(
      RPT.PURCHASES_BY_PERIOD,
      await this.service.getPurchasesByPeriod(filter),
    );
  }

  @Get('top-suppliers')
  @ApiOperation({ summary: 'Top suppliers by purchase volume' })
  @ApiResponse({ status: 200 })
  async getTopSuppliers(@Query() filter: SalesReportFilterDto) {
    return ApiRes(
      RPT.PURCHASES_TOP_SUPPLIERS,
      await this.service.getTopSuppliers(filter),
    );
  }

  @Get('by-product')
  @ApiOperation({ summary: 'Purchases grouped by product' })
  @ApiResponse({ status: 200 })
  async getByProduct(@Query() filter: SalesReportFilterDto) {
    return ApiRes(
      RPT.PURCHASES_BY_PRODUCT,
      await this.service.getPurchasesByProduct(filter),
    );
  }

  @Get('by-period/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export purchases report as XLSX' })
  async getPurchasesXlsx(
    @Query() filter: SalesReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getPurchasesXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rapport-achats.xlsx"',
    );
    res.end(buffer);
  }
}
