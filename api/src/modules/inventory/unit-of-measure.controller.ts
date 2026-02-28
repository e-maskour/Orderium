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
import { UnitOfMeasureService } from './unit-of-measure.service';
import { CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto } from './dto/unit-of-measure.dto';
import { ApiRes } from '../../common/api-response';
import { UOM } from '../../common/response-codes';

@ApiTags('Inventory - Units of Measure')
@Controller('inventory/uom')
export class UnitOfMeasureController {
  constructor(private readonly uomService: UnitOfMeasureService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new unit of measure' })
  @ApiResponse({ status: 201, description: 'Unit of measure created successfully' })
  async create(@Body() createDto: CreateUnitOfMeasureDto) {
    const uom = await this.uomService.create(createDto);
    return ApiRes(UOM.CREATED, uom);
  }

  @Get()
  @ApiOperation({ summary: 'Get all units of measure' })
  @ApiResponse({ status: 200, description: 'List of all units of measure' })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAll(@Query('category') category?: string) {
    const uoms = await this.uomService.findAll(category);
    return ApiRes(UOM.LIST, uoms);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all UoM categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    const categories = await this.uomService.getCategories();
    return ApiRes(UOM.CATEGORIES, categories);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert quantity between units' })
  @ApiResponse({ status: 200, description: 'Converted quantity' })
  @ApiResponse({ status: 400, description: 'Cannot convert between different categories' })
  async convertQuantity(
    @Body() body: { quantity: number; fromUomId: number; toUomId: number },
  ) {
    const result = await this.uomService.convertQuantity(
      body.quantity,
      body.fromUomId,
      body.toUomId,
    );
    return ApiRes(UOM.CONVERTED, { convertedQuantity: result });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit of measure by ID' })
  @ApiResponse({ status: 200, description: 'Unit of measure details' })
  @ApiResponse({ status: 404, description: 'Unit of measure not found' })
  async findOne(@Param('id') id: string) {
    const uom = await this.uomService.findOne(+id);
    return ApiRes(UOM.DETAIL, uom);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update unit of measure' })
  @ApiResponse({ status: 200, description: 'Unit of measure updated successfully' })
  @ApiResponse({ status: 404, description: 'Unit of measure not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateUnitOfMeasureDto) {
    const uom = await this.uomService.update(+id, updateDto);
    return ApiRes(UOM.UPDATED, uom);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete unit of measure (soft delete)' })
  @ApiResponse({ status: 204, description: 'Unit of measure deleted successfully' })
  @ApiResponse({ status: 404, description: 'Unit of measure not found' })
  remove(@Param('id') id: string) {
    return this.uomService.remove(+id);
  }
}
