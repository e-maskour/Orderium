import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(type?: string): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .orderBy('category.name', 'ASC');

    if (type) {
      query.where('category.type = :type', { type });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByType(type: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { type },
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if parent exists if parentId is provided
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${createCategoryDto.parentId} not found`,
        );
      }
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // Check if parent exists if parentId is provided
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new Error('Category cannot be its own parent');
      }
      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${updateCategoryDto.parentId} not found`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async delete(id: number): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new Error(
        'Cannot delete category with child categories. Please delete or reassign children first.',
      );
    }

    await this.categoryRepository.remove(category);
  }

  async getRootCategories(type?: string): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .leftJoinAndSelect('category.children', 'children')
      .orderBy('category.name', 'ASC');

    if (type) {
      query.andWhere('category.type = :type', { type });
    }

    return query.getMany();
  }

  async getHierarchy(type?: string): Promise<Category[]> {
    return this.getRootCategories(type);
  }
}
