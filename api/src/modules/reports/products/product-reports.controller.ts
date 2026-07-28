import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { ProductReportsService } from './product-reports.service';
import { ReportFilterDto } from '../dto/report-filter.dto';

@ApiTags('Reports — Products')
@Controller('reports/products')
export class ProductReportsController {
  constructor(private readonly service: ProductReportsService) {}

  @Get('performance')
  @ApiOperation({ summary: 'Product performance — revenue and qty sold' })
  @ApiResponse({ status: 200 })
  async getProductPerformance(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.PRODUCTS_PERFORMANCE,
      await this.service.getProductPerformance(filter),
    );
  }

  @Get('margin')
  @ApiOperation({ summary: 'Margin analysis — revenue minus cost per product' })
  @ApiResponse({ status: 200 })
  async getMarginAnalysis(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.PRODUCTS_MARGIN,
      await this.service.getMarginAnalysis(filter),
    );
  }

  @Get('never-sold')
  @ApiOperation({ summary: 'Products never sold in the selected period' })
  @ApiResponse({ status: 200 })
  async getNeverSoldProducts(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.PRODUCTS_NEVER_SOLD,
      await this.service.getNeverSoldProducts(filter),
    );
  }

  @Get('performance/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export product performance as XLSX' })
  async getProductPerformanceXlsx(
    @Query() filter: ReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getProductPerformanceXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="performance-produits.xlsx"',
    );
    res.end(buffer);
  }
}
