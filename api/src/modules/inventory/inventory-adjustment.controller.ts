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
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import {
  CreateInventoryAdjustmentDto,
  UpdateInventoryAdjustmentDto,
  ValidateAdjustmentDto,
} from './dto/inventory-adjustment.dto';
import { AdjustmentStatus } from './entities/inventory-adjustment.entity';

@ApiTags('Inventory - Adjustments')
@Controller('inventory/adjustments')
export class InventoryAdjustmentController {
  constructor(
    private readonly adjustmentService: InventoryAdjustmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inventory adjustment' })
  @ApiResponse({ status: 201, description: 'Adjustment created successfully' })
  create(@Body() createDto: CreateInventoryAdjustmentDto) {
    return this.adjustmentService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory adjustments with filters' })
  @ApiResponse({ status: 200, description: 'List of inventory adjustments' })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AdjustmentStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: AdjustmentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (warehouseId) filters.warehouseId = +warehouseId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.adjustmentService.findAll(filters);
  }

  @Get('generate-list/:warehouseId')
  @ApiOperation({ summary: 'Generate counting list for a warehouse' })
  @ApiResponse({ status: 200, description: 'Counting list with theoretical quantities' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  generateCountingList(@Param('warehouseId') warehouseId: string) {
    return this.adjustmentService.generateCountingList(+warehouseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get adjustment by ID' })
  @ApiResponse({ status: 200, description: 'Adjustment details' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  findOne(@Param('id') id: string) {
    return this.adjustmentService.findOne(+id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start counting (set status to IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Counting started successfully' })
  @ApiResponse({ status: 400, description: 'Can only start counting for draft adjustments' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  startCounting(@Param('id') id: string) {
    return this.adjustmentService.startCounting(+id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate adjustment and create stock movements' })
  @ApiResponse({ status: 200, description: 'Adjustment validated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot validate or already validated' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  validate(@Body() validateDto: ValidateAdjustmentDto) {
    return this.adjustmentService.validate(validateDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel validated adjustment' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  cancel(@Param('id') id: string) {
    return this.adjustmentService.cancel(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update adjustment (only if not validated)' })
  @ApiResponse({ status: 200, description: 'Adjustment updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update validated adjustment' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryAdjustmentDto,
  ) {
    return this.adjustmentService.update(+id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete adjustment (only draft)' })
  @ApiResponse({ status: 204, description: 'Adjustment deleted successfully' })
  @ApiResponse({ status: 400, description: 'Can only delete draft adjustments' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  remove(@Param('id') id: string) {
    return this.adjustmentService.remove(+id);
  }
}
