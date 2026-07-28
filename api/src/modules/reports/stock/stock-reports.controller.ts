import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { StockReportsService } from './stock-reports.service';
import {
  StockReportFilterDto,
  ReportFilterDto,
} from '../dto/report-filter.dto';

@ApiTags('Reports — Stock')
@Controller('reports/stock')
export class StockReportsController {
  constructor(private readonly service: StockReportsService) {}

  @Get('valuation')
  @ApiOperation({ summary: 'Stock valuation — stock × cost per product' })
  @ApiResponse({ status: 200 })
  async getStockValuation(@Query() filter: StockReportFilterDto) {
    return ApiRes(
      RPT.STOCK_VALUATION,
      await this.service.getStockValuation(filter),
    );
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Low stock alerts (available qty <= alert threshold)',
  })
  @ApiResponse({ status: 200 })
  async getLowStock(@Query() filter: StockReportFilterDto) {
    return ApiRes(RPT.STOCK_LOW, await this.service.getLowStock(filter));
  }

  @Get('movements-journal')
  @ApiOperation({ summary: 'Stock movements journal (paginated)' })
  @ApiResponse({ status: 200 })
  async getMovementsJournal(@Query() filter: StockReportFilterDto) {
    return ApiRes(
      RPT.STOCK_MOVEMENTS,
      await this.service.getMovementsJournal(filter),
    );
  }

  @Get('slow-dead')
  @ApiOperation({
    summary: 'Slow / dead stock — products with no movement in period',
  })
  @ApiResponse({ status: 200 })
  async getSlowDeadStock(@Query() filter: StockReportFilterDto) {
    return ApiRes(
      RPT.STOCK_SLOW_DEAD,
      await this.service.getSlowDeadStock(filter),
    );
  }

  @Get('by-warehouse')
  @ApiOperation({ summary: 'Stock overview grouped by warehouse' })
  @ApiResponse({ status: 200 })
  async getStockByWarehouse(@Query() filter: StockReportFilterDto) {
    return ApiRes(
      RPT.STOCK_BY_WAREHOUSE,
      await this.service.getStockByWarehouse(filter),
    );
  }

  @Get('valuation/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export stock valuation as XLSX' })
  async getStockValuationXlsx(
    @Query() filter: StockReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getStockValuationXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="valorisation-stock.xlsx"',
    );
    res.end(buffer);
  }
}
