import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { UnitOfMeasure } from '../inventory/entities/unit-of-measure.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

// ─── Repository & Cache Mock Factories ───────────────────────────────────────

const makeQueryBuilderMock = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getCount: jest.fn(),
  getManyAndCount: jest.fn(),
});

const mockRepository = () => {
  const qb = makeQueryBuilderMock();
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    manager: { query: jest.fn() },
    createQueryBuilder: jest.fn(() => qb),
    _qb: qb,
  };
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// ─── Test Data Factories ─────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    name: 'Test Widget',
    code: 'WGT-001',
    price: 29.99,
    cost: 15.0,
    stock: 100,
    isEnabled: true,
    isService: false,
    categories: [],
    ...overrides,
  }) as Product;

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({ id: 1, name: 'Electronics', ...overrides }) as Category;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: ReturnType<typeof mockRepository>;
  let categoryRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    productRepo = mockRepository();
    categoryRepo = mockRepository();
    const uomRepo = mockRepository();
    const warehouseRepo = mockRepository();

    const mockTenantConnService = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Product) return productRepo;
        if (entity === Category) return categoryRepo;
        if (entity === UnitOfMeasure) return uomRepo;
        if (entity === Warehouse) return warehouseRepo;
        return mockRepository();
      }),
      getCurrentDataSource: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a product without categories', async () => {
      const dto = { name: 'Widget', price: 10, stock: 50 };
      const saved = makeProduct({ name: 'Widget', price: 10, stock: 50 });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Widget' }),
      );
      expect(result.name).toBe('Widget');
    });

    it('creates a product and attaches categories', async () => {
      const dto = { name: 'Widget', price: 10, categoryIds: [1, 2] };
      const categories = [
        makeCategory({ id: 1 }),
        makeCategory({ id: 2, name: 'Tools' }),
      ];
      const saved = makeProduct({ categories });
      productRepo.create.mockReturnValue(makeProduct());
      categoryRepo.find.mockResolvedValue(categories);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(categoryRepo.find).toHaveBeenCalled();
      expect(result.categories).toHaveLength(2);
    });

    it('creates a product with zero price', async () => {
      const dto = { name: 'Free Sample', price: 0, stock: 10 };
      const saved = makeProduct({ name: 'Free Sample', price: 0 });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(result.price).toBe(0);
    });

    it('creates a service product (no stock tracking expected by caller)', async () => {
      const dto = { name: 'Consulting', price: 100, isService: true };
      const saved = makeProduct({ isService: true, stock: 0 });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(result.isService).toBe(true);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a product from the database', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const product = makeProduct();
      productRepo.findOne.mockResolvedValue(product);

      const result = await service.findOne(1);

      expect(mockCacheManager.get).toHaveBeenCalledWith('product:1');
      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result).toEqual(product);
    });

    it('returns cached product without hitting the database', async () => {
      const cachedProduct = makeProduct();
      mockCacheManager.get.mockResolvedValue(cachedProduct);

      const result = await service.findOne(1);

      expect(productRepo.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(cachedProduct);
    });

    it('throws NotFoundException for non-existing product', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });

    it('caches product after first database fetch', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const product = makeProduct();
      productRepo.findOne.mockResolvedValue(product);

      await service.findOne(1);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'product:1',
        product,
        300_000,
      );
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      productRepo._qb.getManyAndCount.mockResolvedValue([[makeProduct()], 10]);
    });

    it('returns paginated products', async () => {
      const result = await service.findAll(1, 10);

      expect(result.products).toHaveLength(1);
      expect(result.totalCount).toBe(10);
    });

    it('applies search filter', async () => {
      await service.findAll(1, 10, 'widget');

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :search OR product.code ILIKE :search OR categories.name ILIKE :search)',
        { search: '%widget%' },
      );
    });

    it('applies code filter', async () => {
      await service.findAll(1, 10, undefined, 'WGT');

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'product.code ILIKE :code',
        { code: '%WGT%' },
      );
    });

    it('applies negative stock filter', async () => {
      await service.findAll(1, 10, undefined, undefined, 'negative');

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'product.stock < 0',
      );
    });

    it('applies zero stock filter', async () => {
      await service.findAll(1, 10, undefined, undefined, 'zero');

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'product.stock = 0',
      );
    });

    it('applies positive stock filter', async () => {
      await service.findAll(1, 10, undefined, undefined, 'positive');

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'product.stock > 0',
      );
    });

    it('applies category filter', async () => {
      await service.findAll(1, 10, undefined, undefined, undefined, [1, 2]);

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'categories.id IN (:...categoryIds)',
        { categoryIds: [1, 2] },
      );
    });

    it('applies isService filter', async () => {
      await service.findAll(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      expect(productRepo._qb.andWhere).toHaveBeenCalledWith(
        'product.isService = :isService',
        { isService: true },
      );
    });

    it('applies correct pagination offset (page 3, perPage 10)', async () => {
      await service.findAll(3, 10);

      expect(productRepo._qb.skip).toHaveBeenCalledWith(20);
      expect(productRepo._qb.take).toHaveBeenCalledWith(10);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates product fields and invalidates cache', async () => {
      const existing = makeProduct();
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(existing);
      productRepo.save.mockResolvedValue({
        ...existing,
        name: 'Updated Widget',
      });

      // findOne is called again at the end of update
      const updated = makeProduct({ name: 'Updated Widget' });
      jest.spyOn(service, 'findOne').mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated Widget' } as any);

      expect(mockCacheManager.del).toHaveBeenCalledWith('product:1');
      expect(result.name).toBe('Updated Widget');
    });

    it('updates categories when categoryIds are provided', async () => {
      const existing = makeProduct();
      const newCategories = [makeCategory({ id: 2 })];
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(existing);
      categoryRepo.find.mockResolvedValue(newCategories);
      productRepo.save.mockResolvedValue({
        ...existing,
        categories: newCategories,
      });

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(makeProduct({ categories: newCategories }));

      const result = await service.update(1, { categoryIds: [2] } as any);

      expect(categoryRepo.find).toHaveBeenCalled();
      expect(result.categories).toHaveLength(1);
    });

    it('clears all categories when empty categoryIds array is provided', async () => {
      const existing = makeProduct({ categories: [makeCategory()] });
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(existing);
      productRepo.save.mockResolvedValue({ ...existing, categories: [] });

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(makeProduct({ categories: [] }));

      const result = await service.update(1, { categoryIds: [] } as any);

      expect(result.categories).toHaveLength(0);
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove (soft delete) ───────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a product not used in any invoices or orders', async () => {
      const product = makeProduct();
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(product);
      productRepo.manager.query.mockResolvedValue([{ count: '0' }]);
      productRepo.save.mockImplementation((p) => Promise.resolve(p));

      await service.remove(1);

      expect(product.isEnabled).toBe(false);
      expect(productRepo.save).toHaveBeenCalledWith(product);
      expect(mockCacheManager.del).toHaveBeenCalledWith('product:1');
    });

    it('throws ConflictException when product is used in invoices', async () => {
      const product = makeProduct();
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(product);
      // invoice_items count = 3  (persistent mock so both calls in this test work)
      productRepo.manager.query.mockResolvedValue([{ count: '3' }]);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1)).rejects.toThrow(
        'PRODUCT_IN_INVOICES',
      );
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles product with undefined stock gracefully', async () => {
      const dto = { name: 'No Stock', price: 5 };
      const saved = makeProduct({ stock: undefined });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(result).toBeDefined();
    });

    it('handles very large price values', async () => {
      const dto = { name: 'Enterprise License', price: 999999.99 };
      const saved = makeProduct({ price: 999999.99 });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(result.price).toBe(999999.99);
    });

    it('handles product names with special characters', async () => {
      const dto = { name: 'Café & Résumé #1 (Pro)™', price: 20 };
      const saved = makeProduct({ name: dto.name });
      productRepo.create.mockReturnValue(saved);
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(result.name).toBe(dto.name);
    });
  });
});
