import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
} from '@nestjs/common';
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
  ) {}

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

  /**
   * Paginated root categories with their full subtree attached.
   *
   * Pagination applies to ROOT categories only — children are never split
   * across pages. When `search` is given, a root is kept if it matches or if
   * any of its descendants matches, so the caller can expand straight to the hit.
   */
  async findPaginated(
    page = 1,
    perPage = 50,
    search?: string,
    type?: string,
  ): Promise<{ categories: Category[]; totalCount: number }> {
    const repo = this.categoryRepository;

    // Walk UP from every matching node to find the roots of the subtrees that contain a hit.
    let matchedRootIds: number[] | null = null;
    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      const rows: Array<{ id: number }> = await repo.manager.query(
        `WITH RECURSIVE matched AS (
           SELECT c.id, c."parentId"
           FROM categories c
           WHERE c."isActive" = true
             AND ($2::varchar IS NULL OR c.type = $2)
             AND (c.name ILIKE $1 OR c.description ILIKE $1)
           UNION
           SELECT p.id, p."parentId"
           FROM categories p
           INNER JOIN matched m ON p.id = m."parentId"
         )
         SELECT DISTINCT id FROM matched WHERE "parentId" IS NULL`,
        [pattern, type ?? null],
      );
      matchedRootIds = rows.map((r) => Number(r.id));
      if (matchedRootIds.length === 0) return { categories: [], totalCount: 0 };
    }

    const qb = repo
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = :isActive', { isActive: true });

    if (type) qb.andWhere('category.type = :type', { type });
    if (matchedRootIds)
      qb.andWhere('category.id IN (:...matchedRootIds)', { matchedRootIds });

    qb.orderBy('category.name', 'ASC')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [roots, totalCount] = await qb.getManyAndCount();
    if (roots.length === 0) return { categories: [], totalCount };

    await this.attachSubtrees(roots);
    return { categories: roots, totalCount };
  }

  /** Load every active descendant of the given roots and wire up `children`. */
  private async attachSubtrees(roots: Category[]): Promise<void> {
    const rootIds = roots.map((r) => r.id);
    const descendants: Category[] = await this.categoryRepository.manager.query(
      `WITH RECURSIVE tree AS (
         SELECT c.* FROM categories c WHERE c."parentId" = ANY($1::int[])
         UNION
         SELECT c.* FROM categories c INNER JOIN tree t ON c."parentId" = t.id
       )
       SELECT * FROM tree WHERE "isActive" = true ORDER BY name ASC`,
      [rootIds],
    );

    const childrenByParent = new Map<number, Category[]>();
    for (const node of descendants) {
      node.id = Number(node.id);
      node.parentId = Number(node.parentId);
      const siblings = childrenByParent.get(node.parentId);
      if (siblings) siblings.push(node);
      else childrenByParent.set(node.parentId, [node]);
    }

    for (const node of descendants) {
      node.children = childrenByParent.get(node.id) ?? [];
    }
    for (const root of roots) {
      root.children = childrenByParent.get(root.id) ?? [];
    }
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

    if (category.children && category.children.length > 0) {
      throw new ConflictException('CATEGORY_HAS_CHILDREN');
    }

    // Block if any products are assigned to this category
    const productRows = await this.categoryRepository.manager.query(
      `SELECT COUNT(*) as count FROM product_categories WHERE "categoryId" = $1`,
      [id],
    );
    if (parseInt(productRows[0]?.count || '0') > 0) {
      throw new ConflictException('CATEGORY_HAS_PRODUCTS');
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
