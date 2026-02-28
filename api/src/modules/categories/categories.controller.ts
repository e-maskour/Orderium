import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ApiRes } from '../../common/api-response';
import { CAT } from '../../common/response-codes';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  async findAll(@Query('type') type?: string) {
    const categories = await this.categoriesService.findAll(type);
    return ApiRes(CAT.LIST, categories);
  }

  @Get('hierarchy')
  async getHierarchy(@Query('type') type?: string) {
    const hierarchy = await this.categoriesService.getHierarchy(type);
    return ApiRes(CAT.HIERARCHY, hierarchy);
  }

  @Get('type/:type')
  async findByType(@Param('type') type: string) {
    const categories = await this.categoriesService.findByType(type);
    return ApiRes(CAT.BY_TYPE, categories);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(+id);
    return ApiRes(CAT.DETAIL, category);
  }

  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return ApiRes(CAT.CREATED, category);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(+id, updateCategoryDto);
    return ApiRes(CAT.UPDATED, category);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(+id);
    return ApiRes(CAT.DELETED, null);
  }
}
