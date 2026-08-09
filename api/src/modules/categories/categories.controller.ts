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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { FilterCategoriesDto } from './dto/filter-categories.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryTreeDto } from './dto/category-tree.dto';
import { ApiRes } from '../../common/api-response';
import { CAT } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Categories')
@Serialize(CategoryResponseDto)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  @RequirePermission('categories.view')
  async findAll(@Query('type') type?: string) {
    const categories = await this.categoriesService.findAll(type);
    return ApiRes(CAT.LIST, categories);
  }

  @Get('paginated')
  @Serialize(CategoryTreeDto)
  @ApiOperation({
    summary: 'Get paginated root categories with their subtree',
    description:
      'Pagination applies to root categories; children are returned nested. ' +
      'A search term matches a root when the root itself or any descendant matches.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved',
    type: [CategoryTreeDto],
  })
  @RequirePermission('categories.view')
  async findPaginated(@Query() filterDto: FilterCategoriesDto) {
    const page = filterDto.page ?? 1;
    const perPage = filterDto.perPage ?? 50;

    const { categories, totalCount } =
      await this.categoriesService.findPaginated(
        page,
        perPage,
        filterDto.search,
        filterDto.type,
      );

    const offset = (page - 1) * perPage;
    return ApiRes(CAT.PAGINATED, categories, {
      limit: perPage,
      offset,
      total: totalCount,
      hasNext: offset + perPage < totalCount,
      hasPrev: offset > 0,
    });
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({ status: 200, description: 'Category hierarchy retrieved' })
  @RequirePermission('categories.view')
  async getHierarchy(@Query('type') type?: string) {
    const hierarchy = await this.categoriesService.getHierarchy(type);
    return ApiRes(CAT.HIERARCHY, hierarchy);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get categories by type' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  @RequirePermission('categories.view')
  async findByType(@Param('type') type: string) {
    const categories = await this.categoriesService.findByType(type);
    return ApiRes(CAT.BY_TYPE, categories);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @RequirePermission('categories.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    return ApiRes(CAT.DETAIL, category);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @RequirePermission('categories.create')
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return ApiRes(CAT.CREATED, category);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @RequirePermission('categories.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return ApiRes(CAT.UPDATED, category);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @RequirePermission('categories.delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.delete(id);
    return ApiRes(CAT.DELETED, null);
  }
}
