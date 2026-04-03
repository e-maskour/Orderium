import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { WarehouseResponseDto } from './dto/inventory-response.dto';
import { ApiRes } from '../../common/api-response';
import { WRH } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';

@ApiTags('Inventory - Warehouses')
@Serialize(WarehouseResponseDto)
@Controller('inventory/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  async create(@Body() createDto: CreateWarehouseDto) {
    const warehouse = await this.warehouseService.create(createDto);
    return ApiRes(WRH.CREATED, warehouse);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiResponse({ status: 200, description: 'List of all warehouses' })
  async findAll() {
    const warehouses = await this.warehouseService.findAll();
    return ApiRes(WRH.LIST, warehouses);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse details' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(@Param('id') id: string) {
    const warehouse = await this.warehouseService.findOne(+id);
    return ApiRes(WRH.DETAIL, warehouse);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateWarehouseDto) {
    const warehouse = await this.warehouseService.update(+id, updateDto);
    return ApiRes(WRH.UPDATED, warehouse);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete warehouse (soft delete)' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  remove(@Param('id') id: string) {
    return this.warehouseService.remove(+id);
  }
}
