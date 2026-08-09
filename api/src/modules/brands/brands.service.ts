import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { Product } from '../products/entities/product.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class BrandsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private get brandRepository(): Repository<Brand> {
    return this.tenantConnService.getRepository(Brand);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private async invalidateBrandCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`brand:${id}`);
  }

  /**
   * Guards brand name uniqueness (case-insensitive).
   * `excludeId` skips the brand being updated.
   */
  private async assertNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.brandRepository
      .createQueryBuilder('brand')
      .where('LOWER(brand.name) = LOWER(:name)', { name });

    if (excludeId) qb.andWhere('brand.id != :excludeId', { excludeId });

    if (await qb.getExists()) {
      throw new ConflictException('BRAND_NAME_EXISTS');
    }
  }

  async findAll(search?: string, includeInactive = false): Promise<Brand[]> {
    const qb = this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap('brand.productCount', 'brand.products');

    if (!includeInactive) {
      qb.where('brand.isActive = :isActive', { isActive: true });
    }

    if (search) {
      qb.andWhere('brand.name ILIKE :search', { search: `%${search}%` });
    }

    return qb.orderBy('brand.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Brand> {
    const cacheKey = `brand:${id}`;
    const cached = await this.cacheManager.get<Brand>(cacheKey);
    if (cached) return cached;

    const brand = await this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap('brand.productCount', 'brand.products')
      .where('brand.id = :id', { id })
      .getOne();

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, brand, 300_000);
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    await this.assertNameAvailable(dto.name);
    const brand = this.brandRepository.create(dto);
    const saved = await this.brandRepository.save(brand);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);

    if (dto.name && dto.name.toLowerCase() !== brand.name.toLowerCase()) {
      await this.assertNameAvailable(dto.name, id);
    }

    Object.assign(brand, dto);
    await this.brandRepository.save(brand);
    await this.invalidateBrandCache(id);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const brand = await this.findOne(id);

    const productCount = await this.productRepository.count({
      where: { brandId: id },
    });
    if (productCount > 0) {
      throw new ConflictException('BRAND_HAS_PRODUCTS');
    }

    await this.brandRepository.remove(brand);
    await this.invalidateBrandCache(id);
  }

  /** Products carrying this brand — used by the brand detail view. */
  async findProducts(id: number): Promise<Product[]> {
    await this.findOne(id);
    return this.productRepository.find({
      where: { brandId: id, isEnabled: true },
      order: { name: 'ASC' },
    });
  }
}
