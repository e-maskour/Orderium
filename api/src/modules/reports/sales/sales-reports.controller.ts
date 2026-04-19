import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { SalesReportsService } from './sales-reports.service';
import { SalesReportFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Sales')
@Controller('reports/sales')
export class SalesReportsController {
  constructor(private readonly service: SalesReportsService) { }

  @Get('revenue')
  @ApiOperation({ summary: 'Sales revenue by period' })
  @ApiResponse({ status: 200, description: 'Sales revenue report' })
  async getRevenue(@Query() filter: SalesReportFilterDto) {
    const data = await this.service.getRevenueReport(filter);
    return ApiRes(RPT.SALES_REVENUE, data);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products by revenue & quantity' })
  @ApiResponse({ status: 200, description: 'Top products report' })
  async getTopProducts(@Query() filter: SalesReportFilterDto) {
    const data = await this.service.getTopProducts(filter);
    return ApiRes(RPT.SALES_TOP_PRODUCTS, data);
  }

  @Get('by-customer')
  @ApiOperation({ summary: 'Sales grouped by customer' })
  @ApiResponse({ status: 200, description: 'Sales by customer report' })
  async getByCustomer(@Query() filter: SalesReportFilterDto) {
    const data = await this.service.getSalesByCustomer(filter);
    return ApiRes(RPT.SALES_BY_CUSTOMER, data);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Sales grouped by product category' })
  @ApiResponse({ status: 200, description: 'Sales by category report' })
  async getByCategory(@Query() filter: SalesReportFilterDto) {
    const data = await this.service.getSalesByCategory(filter);
    return ApiRes(RPT.SALES_BY_CATEGORY, data);
  }

  @Get('by-pos')
  @ApiOperation({ summary: 'Sales by channel / POS origin' })
  @ApiResponse({ status: 200, description: 'Sales by POS/channel report' })
  async getByPos(@Query() filter: SalesReportFilterDto) {
    const data = await this.service.getSalesByPos(filter);
    return ApiRes(RPT.SALES_BY_POS, data);
  }

  // ── XLSX exports ──────────────────────────────────────────────────────────

  @Get('revenue/xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({ summary: 'Export sales revenue report as XLSX' })
  @ApiResponse({ status: 200, description: 'XLSX file' })
  async getRevenueXlsx(@Query() filter: SalesReportFilterDto, @Res() res: Response) {
    const buffer = await this.service.getRevenueXlsx(filter);
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-ventes.xlsx"');
    res.end(buffer);
  }
}
