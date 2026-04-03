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
import { StockMovementResponseDto } from './dto/inventory-response.dto';
import { ApiRes } from '../../common/api-response';
import { MOV } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';

@ApiTags('Inventory - Stock Movements')
@Serialize(StockMovementResponseDto)
@Controller('inventory/movements')
export class StockMovementController {
  constructor(private readonly stockService: StockService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new stock movement (draft)' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  async create(@Body() createDto: CreateStockMovementDto) {
    const movement = await this.stockService.createMovement(createDto);
    return ApiRes(MOV.CREATED, movement);
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
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: MovementStatus,
    @Query('movementType') movementType?: MovementType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (productId) filters.productId = +productId;
    if (warehouseId) filters.warehouseId = +warehouseId;
    if (status) filters.status = status;
    if (movementType) filters.movementType = movementType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (search) filters.search = search;

    const movements = await this.stockService.findAllMovements(filters);
    return ApiRes(MOV.LIST, movements);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement by ID' })
  @ApiResponse({ status: 200, description: 'Movement details' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async findOne(@Param('id') id: string) {
    const movement = await this.stockService.findMovement(+id);
    return ApiRes(MOV.DETAIL, movement);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate/execute a stock movement' })
  @ApiResponse({ status: 200, description: 'Movement validated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or already validated',
  })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async validate(@Body() validateDto: ValidateMovementDto) {
    const movement = await this.stockService.validateMovement(validateDto);
    return ApiRes(MOV.VALIDATED, movement);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create and execute internal transfer' })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or invalid warehouses',
  })
  async internalTransfer(@Body() transferDto: InternalTransferDto) {
    const movement = await this.stockService.internalTransfer(transferDto);
    return ApiRes(MOV.TRANSFERRED, movement);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update movement (only if not validated)' })
  @ApiResponse({ status: 200, description: 'Movement updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update validated movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStockMovementDto,
  ) {
    const movement = await this.stockService.updateMovement(+id, updateDto);
    return ApiRes(MOV.UPDATED, movement);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel movement' })
  @ApiResponse({ status: 200, description: 'Movement cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel validated movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async cancel(@Param('id') id: string) {
    const movement = await this.stockService.cancelMovement(+id);
    return ApiRes(MOV.CANCELLED, movement);
  }
}
