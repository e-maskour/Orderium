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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockService } from './stock.service';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  ValidateMovementDto,
  InternalTransferDto,
} from './dto/stock-movement.dto';
import { FilterStockMovementDto } from './dto/filter-stock-movement.dto';
import { StockMovementResponseDto } from './dto/inventory-response.dto';
import { ApiRes } from '../../common/api-response';
import { MOV } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { buildListMeta, parseEndDateFilter } from './stock.helpers';

@ApiTags('Inventory - Stock Movements')
@Serialize(StockMovementResponseDto)
@Controller('inventory/movements')
export class StockMovementController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock movement (draft)' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  @RequirePermission('stock.transfer')
  async create(@Body() createDto: CreateStockMovementDto) {
    const movement = await this.stockService.createMovement(createDto);
    return ApiRes(MOV.CREATED, movement);
  }

  @Get()
  @ApiOperation({
    summary: 'List stock movements (filters, sorting, optional pagination)',
    description:
      'All filters are applied in SQL. metadata.total is the filtered count. ' +
      'Omit page/limit to receive every matching row.',
  })
  @ApiResponse({ status: 200, description: 'List of stock movements' })
  @ApiResponse({ status: 400, description: 'Invalid filter values' })
  @RequirePermission('stock.view')
  async findAll(@Query() query: FilterStockMovementDto = {}) {
    const search = query.search?.trim();
    const { movements, total } = await this.stockService.findAllMovements({
      productId: query.productId,
      warehouseId: query.warehouseId,
      status: query.status,
      movementType: query.movementType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? parseEndDateFilter(query.endDate) : undefined,
      search: search || undefined,
      page: query.page,
      limit: query.limit,
      sortField: query.sortField,
      sortOrder: query.sortOrder,
    });
    return ApiRes(
      MOV.LIST,
      movements,
      buildListMeta(query, total, movements.length),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement by ID' })
  @ApiResponse({ status: 200, description: 'Movement details' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @RequirePermission('stock.view')
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
  @RequirePermission('stock.transfer')
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
  @RequirePermission('stock.transfer')
  async internalTransfer(@Body() transferDto: InternalTransferDto) {
    const movement = await this.stockService.internalTransfer(transferDto);
    return ApiRes(MOV.TRANSFERRED, movement);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update movement (only if not validated)' })
  @ApiResponse({ status: 200, description: 'Movement updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update validated movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @RequirePermission('stock.transfer')
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
  @RequirePermission('stock.transfer')
  async cancel(@Param('id') id: string) {
    const movement = await this.stockService.cancelMovement(+id);
    return ApiRes(MOV.CANCELLED, movement);
  }
}
