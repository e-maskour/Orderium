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
import { ApiRes } from '../../common/api-response';
import { CAT } from '../../common/response-codes';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async findAll(@Query('type') type?: string) {
    const categories = await this.categoriesService.findAll(type);
    return ApiRes(CAT.LIST, categories);
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({ status: 200, description: 'Category hierarchy retrieved' })
  async getHierarchy(@Query('type') type?: string) {
    const hierarchy = await this.categoriesService.getHierarchy(type);
    return ApiRes(CAT.HIERARCHY, hierarchy);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get categories by type' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async findByType(@Param('type') type: string) {
    const categories = await this.categoriesService.findByType(type);
    return ApiRes(CAT.BY_TYPE, categories);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    return ApiRes(CAT.DETAIL, category);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return ApiRes(CAT.CREATED, category);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(
      id,
      updateCategoryDto,
    );
    return ApiRes(CAT.UPDATED, category);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.delete(id);
    return ApiRes(CAT.DELETED, null);
  }
}
