import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private get categoryRepository(): Repository<Category> {
    return this.tenantConnService.getRepository(Category);
  }

  async findAll(type?: string): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.isActive = :isActive', { isActive: true });

    if (type) {
      query.andWhere('category.type = :type', { type });
    }

    query.orderBy('category.name', 'ASC');
    return query.getMany();
  }

  private async invalidateCategoryCache(id?: number) {
    if (id) await this.cacheManager.del(`category:${id}`);
  }

  async findOne(id: number): Promise<Category> {
    const cacheKey = `category:${id}`;
    const cached = await this.cacheManager.get<Category>(cacheKey);
    if (cached) return cached;

    const category = await this.categoryRepository.findOne({
      where: { id, isActive: true },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, category, 300_000);
    return category;
  }

  async findByType(type: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { type, isActive: true },
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
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCategoryCache(id);
    return saved;
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
    await this.invalidateCategoryCache(id);
  }

  async getRootCategories(type?: string): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = :isActive', { isActive: true })
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
