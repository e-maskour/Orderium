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

@ApiTags('Inventory - Stock')
@Controller('inventory/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stock (aggregated across warehouses)' })
  @ApiResponse({ status: 200, description: 'Aggregated stock quantities' })
  getAllStock() {
    return this.stockService.getAllStock();
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get stock for a specific product (all warehouses)' })
  @ApiResponse({ status: 200, description: 'Product stock by warehouse' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProductStock(@Param('productId') productId: string) {
    return this.stockService.getProductStock(+productId);
  }

  @Get('warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get all stock at a specific warehouse' })
  @ApiResponse({ status: 200, description: 'Stock at warehouse' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  getWarehouseStock(@Param('warehouseId') warehouseId: string) {
    return this.stockService.getWarehouseStock(+warehouseId);
  }

  @Get('product/:productId/warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get stock for a product at a specific warehouse' })
  @ApiResponse({ status: 200, description: 'Stock quantity details' })
  getStockAtWarehouse(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.stockService.getStockAtWarehouse(+productId, +warehouseId);
  }

  @Get('low')
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiResponse({ status: 200, description: 'Products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  getLowStockProducts(@Query('threshold') threshold?: string) {
    return this.stockService.getLowStockProducts(threshold ? +threshold : 10);
  }

  @Get('value')
  @ApiOperation({ summary: 'Get total stock value' })
  @ApiResponse({ status: 200, description: 'Stock value and product count' })
  getStockValue() {
    return this.stockService.getStockValue();
  }

  @Post('reserve')
  @ApiOperation({ summary: 'Reserve stock for an order' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient available stock' })
  reserveStock(
    @Body() body: { productId: number; warehouseId: number; quantity: number },
  ) {
    return this.stockService.reserveStock(
      body.productId,
      body.warehouseId,
      body.quantity,
    );
  }

  @Post('unreserve')
  @ApiOperation({ summary: 'Unreserve stock' })
  @ApiResponse({ status: 200, description: 'Stock unreserved successfully' })
  unreserveStock(
    @Body() body: { productId: number; warehouseId: number; quantity: number },
  ) {
    return this.stockService.unreserveStock(
      body.productId,
      body.warehouseId,
      body.quantity,
    );
  }
}
