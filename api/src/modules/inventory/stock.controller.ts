import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ApiRes } from '../../common/api-response';
import { STK } from '../../common/response-codes';

@ApiTags('Inventory - Stock')
@Controller('inventory/stock')
export class StockController {
  constructor(private readonly stockService: StockService) { }

  @Get()
  @ApiOperation({ summary: 'Get all stock (aggregated across warehouses)' })
  @ApiResponse({ status: 200, description: 'Aggregated stock quantities' })
  async getAllStock() {
    const stock = await this.stockService.getAllStock();
    return ApiRes(STK.LIST, stock);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get stock for a specific product (all warehouses)' })
  @ApiResponse({ status: 200, description: 'Product stock by warehouse' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductStock(@Param('productId') productId: string) {
    const stock = await this.stockService.getProductStock(+productId);
    return ApiRes(STK.BY_PRODUCT, stock);
  }

  @Get('warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get all stock at a specific warehouse' })
  @ApiResponse({ status: 200, description: 'Stock at warehouse' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getWarehouseStock(@Param('warehouseId') warehouseId: string) {
    const stock = await this.stockService.getWarehouseStock(+warehouseId);
    return ApiRes(STK.BY_WAREHOUSE, stock);
  }

  @Get('product/:productId/warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get stock for a product at a specific warehouse' })
  @ApiResponse({ status: 200, description: 'Stock quantity details' })
  async getStockAtWarehouse(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    const stock = await this.stockService.getStockAtWarehouse(+productId, +warehouseId);
    return ApiRes(STK.AT_WAREHOUSE, stock);
  }

  @Get('low')
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiResponse({ status: 200, description: 'Products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  async getLowStockProducts(@Query('threshold') threshold?: string) {
    const products = await this.stockService.getLowStockProducts(threshold ? +threshold : 10);
    return ApiRes(STK.LOW_STOCK, products);
  }

  @Get('value')
  @ApiOperation({ summary: 'Get total stock value' })
  @ApiResponse({ status: 200, description: 'Stock value and product count' })
  async getStockValue() {
    const value = await this.stockService.getStockValue();
    return ApiRes(STK.VALUE, value);
  }

  @Post('reserve')
  @ApiOperation({ summary: 'Reserve stock for an order' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient available stock' })
  async reserveStock(
    @Body() body: { productId: number; warehouseId: number; quantity: number },
  ) {
    const stock = await this.stockService.reserveStock(
      body.productId,
      body.warehouseId,
      body.quantity,
    );
    return ApiRes(STK.RESERVED, stock);
  }

  @Post('unreserve')
  @ApiOperation({ summary: 'Unreserve stock' })
  @ApiResponse({ status: 200, description: 'Stock unreserved successfully' })
  async unreserveStock(
    @Body() body: { productId: number; warehouseId: number; quantity: number },
  ) {
    const stock = await this.stockService.unreserveStock(
      body.productId,
      body.warehouseId,
      body.quantity,
    );
    return ApiRes(STK.UNRESERVED, stock);
  }
}
