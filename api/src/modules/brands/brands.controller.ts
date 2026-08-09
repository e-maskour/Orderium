import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { ProductResponseDto } from '../products/dto/product-response.dto';
import { ApiRes } from '../../common/api-response';
import { BRD } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Serialize(BrandResponseDto)
  @ApiOperation({ summary: 'Get all brands' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Brands retrieved',
    type: [BrandResponseDto],
  })
  @RequirePermission('brands.view')
  async findAll(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const brands = await this.brandsService.findAll(
      search,
      includeInactive === 'true',
    );
    return ApiRes(BRD.LIST, brands);
  }

  @Get(':id')
  @Serialize(BrandResponseDto)
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @RequirePermission('brands.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const brand = await this.brandsService.findOne(id);
    return ApiRes(BRD.DETAIL, brand);
  }

  @Get(':id/products')
  @Serialize(ProductResponseDto)
  @ApiOperation({ summary: 'Get products belonging to a brand' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved',
    type: [ProductResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @RequirePermission('brands.view')
  async findProducts(@Param('id', ParseIntPipe) id: number) {
    const products = await this.brandsService.findProducts(id);
    return ApiRes(BRD.PRODUCTS, products);
  }

  @Post()
  @Serialize(BrandResponseDto)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: 201,
    description: 'Brand created',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Brand name already exists' })
  @RequirePermission('brands.create')
  async create(@Body() createBrandDto: CreateBrandDto) {
    const brand = await this.brandsService.create(createBrandDto);
    return ApiRes(BRD.CREATED, brand);
  }

  @Patch(':id')
  @Serialize(BrandResponseDto)
  @ApiOperation({ summary: 'Update a brand' })
  @ApiResponse({
    status: 200,
    description: 'Brand updated',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Brand name already exists' })
  @RequirePermission('brands.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const brand = await this.brandsService.update(id, updateBrandDto);
    return ApiRes(BRD.UPDATED, brand);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiResponse({ status: 200, description: 'Brand deleted' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Brand still has products' })
  @RequirePermission('brands.delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.brandsService.delete(id);
    return ApiRes(BRD.DELETED, null);
  }
}
