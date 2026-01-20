import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  ValidateMovementDto,
  InternalTransferDto,
} from './dto/stock-movement.dto';
import { MovementStatus, MovementType } from './entities/stock-movement.entity';

@ApiTags('Inventory - Stock Movements')
@Controller('inventory/movements')
export class StockMovementController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock movement (draft)' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  create(@Body() createDto: CreateStockMovementDto) {
    return this.stockService.createMovement(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock movements with filters' })
  @ApiResponse({ status: 200, description: 'List of stock movements' })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: MovementStatus })
  @ApiQuery({ name: 'movementType', required: false, enum: MovementType })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: MovementStatus,
    @Query('movementType') movementType?: MovementType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (productId) filters.productId = +productId;
    if (warehouseId) filters.warehouseId = +warehouseId;
    if (status) filters.status = status;
    if (movementType) filters.movementType = movementType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.stockService.findAllMovements(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement by ID' })
  @ApiResponse({ status: 200, description: 'Movement details' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  findOne(@Param('id') id: string) {
    return this.stockService.findMovement(+id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate/execute a stock movement' })
  @ApiResponse({ status: 200, description: 'Movement validated successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or already validated' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  validate(@Body() validateDto: ValidateMovementDto) {
    return this.stockService.validateMovement(validateDto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create and execute internal transfer' })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid warehouses' })
  internalTransfer(@Body() transferDto: InternalTransferDto) {
    return this.stockService.internalTransfer(transferDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update movement (only if not validated)' })
  @ApiResponse({ status: 200, description: 'Movement updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update validated movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateStockMovementDto) {
    return this.stockService.updateMovement(+id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel movement' })
  @ApiResponse({ status: 200, description: 'Movement cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel validated movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  cancel(@Param('id') id: string) {
    return this.stockService.cancelMovement(+id);
  }
}
