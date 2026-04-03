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
import { InventoryAdjustmentResponseDto } from './dto/inventory-response.dto';
import { ApiRes } from '../../common/api-response';
import { ADJ } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';

@ApiTags('Inventory - Adjustments')
@Serialize(InventoryAdjustmentResponseDto)
@Controller('inventory/adjustments')
export class InventoryAdjustmentController {
  constructor(private readonly adjustmentService: InventoryAdjustmentService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new inventory adjustment' })
  @ApiResponse({ status: 201, description: 'Adjustment created successfully' })
  async create(@Body() createDto: CreateInventoryAdjustmentDto) {
    const adjustment = await this.adjustmentService.create(createDto);
    return ApiRes(ADJ.CREATED, adjustment);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory adjustments with filters' })
  @ApiResponse({ status: 200, description: 'List of inventory adjustments' })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AdjustmentStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async findAll(
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

    const adjustments = await this.adjustmentService.findAll(filters);
    return ApiRes(ADJ.LIST, adjustments);
  }

  @Get('generate-list/:warehouseId')
  @ApiOperation({ summary: 'Generate counting list for a warehouse' })
  @ApiResponse({
    status: 200,
    description: 'Counting list with theoretical quantities',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async generateCountingList(
    @Param('warehouseId') warehouseId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const list = await this.adjustmentService.generateCountingList(+warehouseId, {
      search,
      page: page ? +page : 1,
      limit: limit ? +limit : 50,
    });
    return ApiRes(ADJ.COUNTING_LIST, list);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get adjustment by ID' })
  @ApiResponse({ status: 200, description: 'Adjustment details' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async findOne(@Param('id') id: string) {
    const adjustment = await this.adjustmentService.findOne(+id);
    return ApiRes(ADJ.DETAIL, adjustment);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start counting (set status to IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Counting started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only start counting for draft adjustments',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async startCounting(@Param('id') id: string) {
    const adjustment = await this.adjustmentService.startCounting(+id);
    return ApiRes(ADJ.STARTED, adjustment);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate adjustment and create stock movements' })
  @ApiResponse({
    status: 200,
    description: 'Adjustment validated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot validate or already validated',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async validate(@Body() validateDto: ValidateAdjustmentDto) {
    const adjustment = await this.adjustmentService.validate(validateDto);
    return ApiRes(ADJ.VALIDATED, adjustment);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel adjustment' })
  @ApiResponse({
    status: 200,
    description: 'Adjustment cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel validated adjustment',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async cancel(@Param('id') id: string) {
    const adjustment = await this.adjustmentService.cancel(+id);
    return ApiRes(ADJ.CANCELLED, adjustment);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update adjustment (only if not validated)' })
  @ApiResponse({ status: 200, description: 'Adjustment updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot update validated adjustment',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryAdjustmentDto,
  ) {
    const adjustment = await this.adjustmentService.update(+id, updateDto);
    return ApiRes(ADJ.UPDATED, adjustment);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete adjustment (only draft)' })
  @ApiResponse({ status: 204, description: 'Adjustment deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only delete draft adjustments',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  remove(@Param('id') id: string) {
    return this.adjustmentService.remove(+id);
  }
}
