// Mock ESM-only and native modules before imports
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));
jest.mock('minio', () => ({ Client: jest.fn() }));
jest.mock('sharp', () =>
  jest.fn(() => ({ resize: jest.fn().mockReturnThis(), toBuffer: jest.fn() })),
);

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ImageService } from '../images/services/image.service';

// ─── Service Mocks ────────────────────────────────────────────────────────────

const mockProductsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  hardDelete: jest.fn(),
  exportToXlsx: jest.fn(),
  importFromXlsx: jest.fn(),
};

const mockImageService = {
  uploadProductImage: jest.fn(),
  deleteProductImage: jest.fn(),
};

// ─── Test Data ────────────────────────────────────────────────────────────────

const productStub = {
  id: 1,
  name: 'Test Widget',
  code: 'WGT-001',
  price: 29.99,
  stock: 100,
  isEnabled: true,
  isService: false,
  categories: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: ImageService, useValue: mockImageService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  // ─── POST /products/create ───────────────────────────────────────────────────

  describe('create', () => {
    it('creates product and returns wrapped response', async () => {
      mockProductsService.create.mockResolvedValue(productStub);

      const result = await controller.create({
        name: 'Test Widget',
        price: 29.99,
        stock: 100,
      } as any);

      expect(mockProductsService.create).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(productStub);
      expect(result.status).toBe(201);
    });
  });

  // ─── POST /products/filter ───────────────────────────────────────────────────

  describe('filterProducts', () => {
    it('returns paginated products with default page and perPage', async () => {
      mockProductsService.findAll.mockResolvedValue({
        products: [productStub],
        count: 1,
        totalCount: 1,
      });

      const result = await controller.filterProducts({} as any);

      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        1,
        50,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result.data).toHaveLength(1);
      expect(result.metadata).toMatchObject({
        limit: 50,
        offset: 0,
        total: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('applies search filter from body', async () => {
      mockProductsService.findAll.mockResolvedValue({
        products: [],
        count: 0,
        totalCount: 0,
      });

      await controller.filterProducts({ search: 'widget' } as any);

      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        1,
        50,
        'widget',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('clamps page to minimum 1', async () => {
      mockProductsService.findAll.mockResolvedValue({
        products: [],
        count: 0,
        totalCount: 0,
      });

      await controller.filterProducts({} as any, '0', '10');

      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('clamps perPage to maximum 100', async () => {
      mockProductsService.findAll.mockResolvedValue({
        products: [],
        count: 0,
        totalCount: 0,
      });

      await controller.filterProducts({} as any, '1', '500');

      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        1,
        100,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('computes correct pagination metadata', async () => {
      mockProductsService.findAll.mockResolvedValue({
        products: Array(10).fill(productStub),
        count: 10,
        totalCount: 35,
      });

      const result = await controller.filterProducts({} as any, '2', '10');

      expect(result.metadata).toMatchObject({
        limit: 10,
        offset: 10,
        total: 35,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  // ─── GET /products/:id ───────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns product details', async () => {
      mockProductsService.findOne.mockResolvedValue(productStub);

      const result = await controller.findOne(1);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(result.data).toEqual(productStub);
    });

    it('propagates NotFoundException', async () => {
      mockProductsService.findOne.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── PATCH /products/:id ─────────────────────────────────────────────────────

  describe('update', () => {
    it('updates product and returns updated data', async () => {
      const updated = { ...productStub, name: 'Updated Widget' };
      mockProductsService.update.mockResolvedValue(updated);

      const result = await controller.update(1, {
        name: 'Updated Widget',
      } as any);

      expect(mockProductsService.update).toHaveBeenCalledWith(1, {
        name: 'Updated Widget',
      });
      expect(result.data.name).toBe('Updated Widget');
    });

    it('propagates NotFoundException when product does not exist', async () => {
      mockProductsService.update.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.update(999, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── DELETE /products/:id ────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a product successfully', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(mockProductsService.remove).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
    });

    it('propagates ConflictException when product is in use', async () => {
      mockProductsService.remove.mockRejectedValue(
        new ConflictException('Cannot delete product that is used in invoices'),
      );

      await expect(controller.remove(1)).rejects.toThrow(ConflictException);
    });
  });
});
