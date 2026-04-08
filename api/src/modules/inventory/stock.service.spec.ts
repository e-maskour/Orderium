import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockService } from './stock.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { StockQuant } from './entities/stock-quant.entity';
import {
  StockMovement,
  MovementType,
  MovementStatus,
  SourceDocumentType,
} from './entities/stock-movement.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';

// ─── Repository Mock Factory ──────────────────────────────────────────────────

const makeQueryBuilderMock = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
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
    createQueryBuilder: jest.fn(() => qb),
    _qb: qb,
  };
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
  query: jest.fn(),
};

// ─── Test Data Factories ─────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    name: 'Test Product',
    code: 'TEST-001',
    isEnabled: true,
    price: 10,
    ...overrides,
  }) as Product;

const makeWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse =>
  ({
    id: 1,
    name: 'Main Warehouse',
    code: 'WH-001',
    isActive: true,
    ...overrides,
  }) as Warehouse;

const makeStockQuant = (overrides: Partial<StockQuant> = {}): StockQuant =>
  ({
    id: 1,
    productId: 1,
    warehouseId: 1,
    quantity: 100,
    reservedQuantity: 10,
    availableQuantity: 90,
    incomingQuantity: 0,
    outgoingQuantity: 0,
    ...overrides,
  }) as StockQuant;

const makeMovement = (overrides: Partial<StockMovement> = {}): StockMovement =>
  ({
    id: 1,
    reference: 'IN/2026/00001',
    movementType: MovementType.RECEIPT,
    productId: 1,
    sourceWarehouseId: null,
    destWarehouseId: 1,
    quantity: 50,
    status: MovementStatus.DRAFT,
    product: makeProduct(),
    sourceWarehouse: null,
    destWarehouse: makeWarehouse(),
    ...overrides,
  }) as StockMovement;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockService', () => {
  let service: StockService;
  let stockQuantRepo: ReturnType<typeof mockRepository>;
  let stockMovementRepo: ReturnType<typeof mockRepository>;
  let warehouseRepo: ReturnType<typeof mockRepository>;
  let productRepo: ReturnType<typeof mockRepository>;
  let uomRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    stockQuantRepo = mockRepository();
    stockMovementRepo = mockRepository();
    warehouseRepo = mockRepository();
    productRepo = mockRepository();
    uomRepo = mockRepository();

    const repoMap = new Map<unknown, ReturnType<typeof mockRepository>>([
      [StockQuant, stockQuantRepo],
      [StockMovement, stockMovementRepo],
      [Warehouse, warehouseRepo],
      [Product, productRepo],
      [UnitOfMeasure, uomRepo],
    ]);

    const mockTenantConnService = {
      getRepository: jest.fn(
        (entity: unknown) => repoMap.get(entity) ?? mockRepository(),
      ),
      getCurrentDataSource: jest.fn(() => mockDataSource),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: 'TenantConnectionService',
          useValue: mockTenantConnService,
        },
        // Also register under the class token so NestJS DI resolves it
        {
          provide: TenantConnectionService,
          useValue: mockTenantConnService,
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);

    jest.clearAllMocks();
    mockQueryRunner.connect.mockReset();
    mockQueryRunner.startTransaction.mockReset();
    mockQueryRunner.commitTransaction.mockReset();
    mockQueryRunner.rollbackTransaction.mockReset();
    mockQueryRunner.release.mockReset();
    mockQueryRunner.manager.save.mockReset();
    mockQueryRunner.manager.findOne.mockReset();
    mockQueryRunner.manager.create.mockReset();

    // Default: manager.create returns the data object passed in
    mockQueryRunner.manager.create.mockImplementation(
      (_Entity: unknown, data: unknown) => data,
    );
    mockQueryRunner.manager.save.mockImplementation(
      (_Entity: unknown, data: unknown) => Promise.resolve(data),
    );
  });

  // ─── getProductStock ────────────────────────────────────────────────────────

  describe('getProductStock', () => {
    it('returns stock quants for a valid product', async () => {
      const product = makeProduct();
      const quants = [makeStockQuant()];
      productRepo.findOne.mockResolvedValue(product);
      stockQuantRepo.find.mockResolvedValue(quants);

      const result = await service.getProductStock(1);

      expect(productRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(stockQuantRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 1 } }),
      );
      expect(result).toEqual(quants);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.getProductStock(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProductStock(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });

    it('returns empty array when product has no stock records', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      stockQuantRepo.find.mockResolvedValue([]);

      const result = await service.getProductStock(1);

      expect(result).toEqual([]);
    });
  });

  // ─── getStockAtWarehouse ────────────────────────────────────────────────────

  describe('getStockAtWarehouse', () => {
    it('returns existing stock quant for a product-warehouse pair', async () => {
      const quant = makeStockQuant();
      stockQuantRepo.findOne.mockResolvedValue(quant);

      const result = await service.getStockAtWarehouse(1, 1);

      expect(result).toEqual(quant);
    });

    it('returns a zero-quantity stock quant when none exists', async () => {
      stockQuantRepo.findOne.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      stockQuantRepo.create.mockImplementation((data) => data);

      const result = await service.getStockAtWarehouse(1, 1);

      expect(result.quantity).toBe(0);
      expect(result.reservedQuantity).toBe(0);
      expect(result.availableQuantity).toBe(0);
      expect(result.incomingQuantity).toBe(0);
      expect(result.outgoingQuantity).toBe(0);
    });
  });

  // ─── getWarehouseStock ──────────────────────────────────────────────────────

  describe('getWarehouseStock', () => {
    it('returns all stock quants for a valid warehouse', async () => {
      const warehouse = makeWarehouse();
      const quants = [
        makeStockQuant(),
        makeStockQuant({ id: 2, productId: 2 }),
      ];
      warehouseRepo.findOne.mockResolvedValue(warehouse);
      stockQuantRepo.find.mockResolvedValue(quants);

      const result = await service.getWarehouseStock(1);

      expect(warehouseRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toHaveLength(2);
    });

    it('throws NotFoundException for non-existing warehouse', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.getWarehouseStock(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getWarehouseStock(999)).rejects.toThrow(
        'Warehouse with ID 999 not found',
      );
    });
  });

  // ─── updateStockQuant ───────────────────────────────────────────────────────

  describe('updateStockQuant', () => {
    it('creates a new stock quant when none exists', async () => {
      stockQuantRepo.findOne.mockResolvedValue(null);
      const newQuant = makeStockQuant({ quantity: 50, availableQuantity: 50 });
      stockQuantRepo.create.mockReturnValue(newQuant);
      stockQuantRepo.save.mockResolvedValue(newQuant);

      const result = await service.updateStockQuant(1, 1, 50);

      expect(stockQuantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 1, warehouseId: 1, quantity: 50 }),
      );
      expect(result.quantity).toBe(50);
    });

    it('increments quantity on an existing stock quant', async () => {
      const existing = makeStockQuant({
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
      });
      stockQuantRepo.findOne.mockResolvedValue(existing);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.updateStockQuant(1, 1, 20);

      expect(result.quantity).toBe(120);
      expect(result.availableQuantity).toBe(110); // 120 - 10 reserved
    });

    it('decrements quantity correctly', async () => {
      const existing = makeStockQuant({
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
      });
      stockQuantRepo.findOne.mockResolvedValue(existing);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.updateStockQuant(1, 1, -30);

      expect(result.quantity).toBe(70);
      expect(result.availableQuantity).toBe(70);
    });

    it('results in negative quantity when stock goes below zero (no guard in updateStockQuant)', async () => {
      const existing = makeStockQuant({
        quantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
      });
      stockQuantRepo.findOne.mockResolvedValue(existing);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.updateStockQuant(1, 1, -50);

      // BUG: updateStockQuant does not guard against negative stock; test documents current behaviour
      expect(result.quantity).toBe(-40);
    });

    it('handles decimal quantities (string coercion path)', async () => {
      const existing = makeStockQuant({ quantity: '50' as any });
      stockQuantRepo.findOne.mockResolvedValue(existing);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.updateStockQuant(1, 1, 25);

      expect(result.quantity).toBe(75);
    });
  });

  // ─── reserveStock ───────────────────────────────────────────────────────────

  describe('reserveStock', () => {
    it('reserves stock when available quantity is sufficient', async () => {
      const quant = makeStockQuant({
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
      });
      stockQuantRepo.findOne.mockResolvedValue(quant);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.reserveStock(1, 1, 30);

      expect(result.reservedQuantity).toBe(30);
      expect(result.availableQuantity).toBe(70);
    });

    it('throws BadRequestException when available quantity is insufficient', async () => {
      const quant = makeStockQuant({
        quantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
      });
      stockQuantRepo.findOne.mockResolvedValue(quant);

      await expect(service.reserveStock(1, 1, 50)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reserveStock(1, 1, 50)).rejects.toThrow(
        'Insufficient available stock',
      );
    });

    it('throws BadRequestException when available quantity is exactly zero', async () => {
      const quant = makeStockQuant({
        quantity: 50,
        reservedQuantity: 50,
        availableQuantity: 0,
      });
      stockQuantRepo.findOne.mockResolvedValue(quant);

      await expect(service.reserveStock(1, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows reserving the entire available quantity', async () => {
      const quant = makeStockQuant({
        quantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
      });
      stockQuantRepo.findOne.mockResolvedValue(quant);
      stockQuantRepo.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.reserveStock(1, 1, 50);

      expect(result.reservedQuantity).toBe(50);
      expect(result.availableQuantity).toBe(0);
    });

    it('does not reserve when product has no stock entry (zero quant case)', async () => {
      stockQuantRepo.findOne.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      stockQuantRepo.create.mockImplementation((d) => d);

      await expect(service.reserveStock(1, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── createMovement ─────────────────────────────────────────────────────────

  describe('createMovement', () => {
    const validDto = {
      movementType: MovementType.RECEIPT,
      productId: 1,
      destWarehouseId: 1,
      quantity: 50,
    };

    beforeEach(() => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      uomRepo.findOne.mockResolvedValue(null);
    });

    it('creates a movement in DRAFT status with auto-generated reference', async () => {
      stockMovementRepo.findOne.mockResolvedValue(null); // no prior movements
      const savedMovement = makeMovement({ status: MovementStatus.DRAFT });
      stockMovementRepo.create.mockReturnValue(savedMovement);
      stockMovementRepo.save.mockResolvedValue(savedMovement);

      const result = await service.createMovement(validDto);

      expect(stockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: MovementStatus.DRAFT }),
      );
      expect(result.status).toBe(MovementStatus.DRAFT);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.createMovement(validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when source warehouse does not exist', async () => {
      const dto = { ...validDto, sourceWarehouseId: 999 };
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.createMovement(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when destination warehouse does not exist', async () => {
      const dto = { ...validDto, destWarehouseId: 999 };
      // First call is source warehouse (not provided), second call is dest warehouse
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.createMovement(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when unit of measure does not exist', async () => {
      const dto = { ...validDto, unitOfMeasureId: 999 };
      uomRepo.findOne.mockResolvedValue(null);

      await expect(service.createMovement(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('generates sequential reference numbers for same movement type', async () => {
      const lastMovement = makeMovement({ reference: 'IN/2026/00005' });
      stockMovementRepo.findOne.mockResolvedValue(lastMovement);

      const capturedData: any[] = [];
      const movement = makeMovement();
      stockMovementRepo.create.mockImplementation((data) => {
        capturedData.push(data);
        return movement;
      });
      stockMovementRepo.save.mockResolvedValue(movement);

      await service.createMovement(validDto);

      expect(capturedData[0].reference).toBe('IN/2026/00006');
    });
  });

  // ─── validateMovement ───────────────────────────────────────────────────────

  describe('validateMovement', () => {
    it('validates a DRAFT movement and updates stock', async () => {
      const movement = makeMovement({
        status: MovementStatus.DRAFT,
        movementType: MovementType.RECEIPT,
        sourceWarehouseId: null,
        destWarehouseId: 1,
        quantity: 50,
      });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      // _updateStockQuantWithManager uses queryRunner.manager.findOne / save
      mockQueryRunner.manager.findOne.mockResolvedValue(makeStockQuant());
      mockQueryRunner.manager.save.mockResolvedValue({
        ...movement,
        status: MovementStatus.DONE,
      });

      // findMovement is called at the end
      const doneMov = makeMovement({
        status: MovementStatus.DONE,
        dateDone: new Date(),
      });
      jest.spyOn(service, 'findMovement').mockResolvedValue(doneMov);

      const result = await service.validateMovement({ movementId: 1 });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe(MovementStatus.DONE);
    });

    it('throws NotFoundException when movement does not exist', async () => {
      stockMovementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateMovement({ movementId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when movement is already DONE', async () => {
      stockMovementRepo.findOne.mockResolvedValue(
        makeMovement({ status: MovementStatus.DONE }),
      );

      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        'Movement already validated',
      );
    });

    it('throws BadRequestException when movement is CANCELLED', async () => {
      stockMovementRepo.findOne.mockResolvedValue(
        makeMovement({ status: MovementStatus.CANCELLED }),
      );

      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        'Cannot validate cancelled movement',
      );
    });

    it('throws BadRequestException on insufficient stock for DELIVERY', async () => {
      const movement = makeMovement({
        status: MovementStatus.DRAFT,
        movementType: MovementType.DELIVERY,
        sourceWarehouseId: 1,
        destWarehouseId: null,
        quantity: 200,
      });
      movement.sourceWarehouse = makeWarehouse({ name: 'Main Warehouse' });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      // Stock quant with only 10 available
      stockQuantRepo.findOne.mockResolvedValue(
        makeStockQuant({
          quantity: 10,
          reservedQuantity: 0,
          availableQuantity: 10,
        }),
      );

      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        'Insufficient stock',
      );
    });

    it('skips stock check for RECEIPT movements (no source warehouse)', async () => {
      const movement = makeMovement({
        status: MovementStatus.DRAFT,
        movementType: MovementType.RECEIPT,
        sourceWarehouseId: null,
        destWarehouseId: 1,
        quantity: 999,
      });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      mockQueryRunner.manager.findOne.mockResolvedValue(makeStockQuant());
      mockQueryRunner.manager.save.mockResolvedValue(movement);

      const doneMov = makeMovement({ status: MovementStatus.DONE });
      jest.spyOn(service, 'findMovement').mockResolvedValue(doneMov);

      // Should NOT throw because RECEIPT has no source warehouse
      const result = await service.validateMovement({ movementId: 1 });
      expect(result.status).toBe(MovementStatus.DONE);
    });

    it('rolls back transaction on error during save', async () => {
      const movement = makeMovement({
        status: MovementStatus.DRAFT,
        movementType: MovementType.RECEIPT,
        sourceWarehouseId: null,
        destWarehouseId: 1,
        quantity: 50,
      });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      // Trigger failure inside the transaction on manager.findOne
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.validateMovement({ movementId: 1 })).rejects.toThrow(
        'DB error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ─── internalTransfer ───────────────────────────────────────────────────────

  describe('internalTransfer', () => {
    const transferDto = {
      productId: 1,
      sourceWarehouseId: 1,
      destWarehouseId: 2,
      quantity: 30,
    };

    it('throws BadRequestException when source and destination are the same warehouse', async () => {
      await expect(
        service.internalTransfer({ ...transferDto, destWarehouseId: 1 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.internalTransfer({ ...transferDto, destWarehouseId: 1 }),
      ).rejects.toThrow('Source and destination warehouses cannot be the same');
    });

    it('creates and auto-validates an INTERNAL movement', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      stockMovementRepo.findOne.mockResolvedValueOnce(null); // for reference generation

      const draftMovement = makeMovement({
        movementType: MovementType.INTERNAL,
        sourceWarehouseId: 1,
        destWarehouseId: 2,
        status: MovementStatus.DRAFT,
      });
      stockMovementRepo.create.mockReturnValue(draftMovement);
      stockMovementRepo.save.mockResolvedValue(draftMovement);

      // For validateMovement -> findOne
      stockMovementRepo.findOne.mockResolvedValue({
        ...draftMovement,
        sourceWarehouse: makeWarehouse({ id: 1 }),
        destWarehouse: makeWarehouse({ id: 2 }),
      });

      const sourceQuant = makeStockQuant({
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
      });
      stockQuantRepo.findOne.mockResolvedValue(sourceQuant); // for availability check
      mockQueryRunner.manager.findOne.mockResolvedValue(sourceQuant); // for _updateStockQuantWithManager
      mockQueryRunner.manager.save.mockResolvedValue({
        ...draftMovement,
        status: MovementStatus.DONE,
      });

      const doneMov = makeMovement({
        movementType: MovementType.INTERNAL,
        status: MovementStatus.DONE,
      });
      jest.spyOn(service, 'findMovement').mockResolvedValue(doneMov);

      const result = await service.internalTransfer(transferDto);

      expect(result.movementType).toBe(MovementType.INTERNAL);
      expect(result.status).toBe(MovementStatus.DONE);
    });
  });

  // ─── cancelMovement ──────────────────────────────────────────────────────────

  describe('cancelMovement', () => {
    it('cancels a DRAFT movement', async () => {
      const movement = makeMovement({ status: MovementStatus.DRAFT });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      stockMovementRepo.save.mockImplementation((m) =>
        Promise.resolve({ ...m, status: MovementStatus.CANCELLED }),
      );

      const result = await service.cancelMovement(1);

      expect(result.status).toBe(MovementStatus.CANCELLED);
    });

    it('throws BadRequestException when cancelling a DONE movement', async () => {
      stockMovementRepo.findOne.mockResolvedValue(
        makeMovement({ status: MovementStatus.DONE }),
      );

      await expect(service.cancelMovement(1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelMovement(1)).rejects.toThrow(
        'Cannot cancel validated movement',
      );
    });
  });

  // ─── getLowStockProducts ────────────────────────────────────────────────────

  describe('getLowStockProducts', () => {
    it('returns products below default threshold of 10', async () => {
      const lowStockData = [
        { productId: 1, productName: 'Widget', totalAvailable: 5 },
        { productId: 2, productName: 'Gadget', totalAvailable: 2 },
      ];
      mockDataSource.query.mockResolvedValue(lowStockData);

      const result = await service.getLowStockProducts();

      expect(result).toHaveLength(2);
    });

    it('accepts a custom threshold', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getLowStockProducts(50);

      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('returns empty array when all products have sufficient stock', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getLowStockProducts(5);

      expect(result).toEqual([]);
    });
  });

  // ─── getAllStock ─────────────────────────────────────────────────────────────

  describe('getAllStock', () => {
    it('returns aggregated stock across all warehouses', async () => {
      const aggregatedData = [
        {
          productId: 1,
          productName: 'Widget',
          totalQuantity: 150,
          totalAvailable: 130,
        },
      ];
      mockDataSource.query.mockResolvedValue(aggregatedData);

      const result = await service.getAllStock();

      expect(result).toHaveLength(1);
      expect(result[0].productName).toBe('Widget');
    });
  });

  // ─── getStockValue ───────────────────────────────────────────────────────────

  describe('getStockValue', () => {
    it('returns total stock value and product count', async () => {
      const valueData = [{ totalValue: 15000, productCount: 25 }];
      mockDataSource.query.mockResolvedValue(valueData);

      const result = await service.getStockValue();

      expect(result).toBeDefined();
    });
  });

  // ─── findAllMovements (filters) ──────────────────────────────────────────────

  describe('findAllMovements', () => {
    beforeEach(() => {
      stockMovementRepo._qb.getMany.mockResolvedValue([makeMovement()]);
    });

    it('returns all movements without filters', async () => {
      const result = await service.findAllMovements();

      expect(result).toHaveLength(1);
    });

    it('applies productId filter', async () => {
      await service.findAllMovements({ productId: 5 });

      expect(stockMovementRepo._qb.andWhere).toHaveBeenCalledWith(
        'movement.productId = :productId',
        { productId: 5 },
      );
    });

    it('applies status filter', async () => {
      await service.findAllMovements({ status: MovementStatus.DONE });

      expect(stockMovementRepo._qb.andWhere).toHaveBeenCalledWith(
        'movement.status = :status',
        {
          status: MovementStatus.DONE,
        },
      );
    });

    it('applies combined warehouse filter on both source and dest', async () => {
      await service.findAllMovements({ warehouseId: 3 });

      expect(stockMovementRepo._qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('sourceWarehouseId'),
        { warehouseId: 3 },
      );
    });

    it('applies date range filters', async () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-03-31');

      await service.findAllMovements({ startDate: start, endDate: end });

      expect(stockMovementRepo._qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateCreated >= :startDate'),
        { startDate: start },
      );
      expect(stockMovementRepo._qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateCreated <= :endDate'),
        { endDate: end },
      );
    });
  });

  // ─── updateMovement ──────────────────────────────────────────────────────────

  describe('updateMovement', () => {
    it('updates a DRAFT movement', async () => {
      const movement = makeMovement({ status: MovementStatus.DRAFT });
      stockMovementRepo.findOne.mockResolvedValue(movement);
      stockMovementRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.updateMovement(1, { quantity: 75 });

      expect(result.quantity).toBe(75);
    });

    it('throws BadRequestException when updating a DONE movement', async () => {
      stockMovementRepo.findOne.mockResolvedValue(
        makeMovement({ status: MovementStatus.DONE }),
      );

      await expect(service.updateMovement(1, { quantity: 75 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateMovement(1, { quantity: 75 })).rejects.toThrow(
        'Cannot update validated movement',
      );
    });
  });

  // ─── processDocumentStockMovements ───────────────────────────────────────────

  describe('processDocumentStockMovements', () => {
    const baseParams = {
      sourceDocumentType: SourceDocumentType.ORDER,
      sourceDocumentId: 42,
      items: [
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 5 },
      ],
      warehouseId: 1,
      movementType: MovementType.DELIVERY,
      origin: 'BL/2026/00042',
      partnerName: 'Client ACME',
    };

    beforeEach(() => {
      stockMovementRepo.find.mockResolvedValue([]); // no existing movements by default
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // no prior stock quant
      mockQueryRunner.manager.create.mockImplementation(
        (_Entity: unknown, data: unknown) => data,
      );
      mockQueryRunner.manager.save.mockImplementation(
        (_Entity: unknown, data: unknown) => Promise.resolve(data),
      );
    });

    it('creates DONE movements for all valid items', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeProduct({ id: 1 })) // product 1 exists
        .mockResolvedValueOnce(makeStockQuant({ availableQuantity: 50 })) // stock check
        .mockResolvedValueOnce(null) // no prior quant → will create
        .mockResolvedValueOnce(makeProduct({ id: 2 })) // product 2 exists
        .mockResolvedValueOnce(makeStockQuant({ availableQuantity: 20 })) // stock check
        .mockResolvedValueOnce(null); // no prior quant

      // for reference generation
      stockMovementRepo.findOne.mockResolvedValue(null);

      const results = await service.processDocumentStockMovements(baseParams);

      expect(results).toHaveLength(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('is idempotent — skips processing when DONE movements already exist', async () => {
      const existingMovements = [
        makeMovement({ status: MovementStatus.DONE, sourceDocumentId: 42 }),
      ];
      stockMovementRepo.find.mockResolvedValue(existingMovements);

      const results = await service.processDocumentStockMovements(baseParams);

      expect(results).toHaveLength(1);
      expect(mockQueryRunner.connect).not.toHaveBeenCalled(); // no transaction started
    });

    it('throws BadRequestException for outgoing movement when stock is insufficient', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeProduct({ id: 1 })) // product exists
        .mockResolvedValueOnce(
          makeStockQuant({
            productId: 1,
            warehouseId: 1,
            availableQuantity: 2,
          }),
        ); // insufficient stock (need 10)

      stockMovementRepo.findOne.mockResolvedValue(null);

      let thrown: unknown;
      try {
        await service.processDocumentStockMovements(baseParams);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      expect((thrown as BadRequestException).message).toMatch(
        /insufficient stock/i,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('skips items with no productId or zero quantity', async () => {
      const paramsWithInvalid = {
        ...baseParams,
        items: [
          { productId: 0, quantity: 10 }, // productId falsy
          { productId: 1, quantity: 0 }, // zero quantity
        ],
      };

      const results =
        await service.processDocumentStockMovements(paramsWithInvalid);

      expect(results).toHaveLength(0);
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('returns empty array when all items are empty', async () => {
      const results = await service.processDocumentStockMovements({
        ...baseParams,
        items: [],
      });

      expect(results).toHaveLength(0);
    });

    it('skips product silently if it does not exist in DB', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(null) // product 1 not found
        .mockResolvedValueOnce(makeProduct({ id: 2 })) // product 2 exists
        .mockResolvedValueOnce(makeStockQuant({ availableQuantity: 20 })) // stock check p2
        .mockResolvedValueOnce(null); // no prior quant p2

      stockMovementRepo.findOne.mockResolvedValue(null);

      const results = await service.processDocumentStockMovements(baseParams);

      // Only product 2 creates a movement (product 1 skipped)
      expect(results).toHaveLength(1);
    });

    it('does NOT check stock availability for RECEIPT movements (incoming)', async () => {
      const receiptParams = {
        ...baseParams,
        movementType: MovementType.RECEIPT,
        items: [{ productId: 1, quantity: 500 }], // large quantity — no check needed
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeProduct({ id: 1 }))
        .mockResolvedValueOnce(null); // quant update: no existing quant

      stockMovementRepo.findOne.mockResolvedValue(null);

      const results =
        await service.processDocumentStockMovements(receiptParams);

      expect(results).toHaveLength(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rolls back and re-throws on any DB error inside transaction', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(
        makeProduct({ id: 1 }),
      );
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('DB write fail'),
      );

      stockMovementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processDocumentStockMovements({
          ...baseParams,
          items: [{ productId: 1, quantity: 10 }],
          movementType: MovementType.RECEIPT, // skip stock check
        }),
      ).rejects.toThrow('DB write fail');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('attaches sourceDocumentType and sourceDocumentId to created movement', async () => {
      const capturedMoves: unknown[] = [];
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeProduct({ id: 1 }))
        .mockResolvedValueOnce(null); // quant

      mockQueryRunner.manager.create.mockImplementation(
        (_Entity: unknown, data: unknown) => {
          capturedMoves.push(data);
          return data;
        },
      );
      mockQueryRunner.manager.save.mockImplementation(
        (_E: unknown, d: unknown) => Promise.resolve(d),
      );
      stockMovementRepo.findOne.mockResolvedValue(null);

      await service.processDocumentStockMovements({
        ...baseParams,
        movementType: MovementType.RECEIPT,
        items: [{ productId: 1, quantity: 5 }],
      });

      const movData = capturedMoves.find(
        (d: any) => d.sourceDocumentType !== undefined,
      ) as any;
      expect(movData?.sourceDocumentType).toBe(SourceDocumentType.ORDER);
      expect(movData?.sourceDocumentId).toBe(42);
    });
  });

  // ─── reverseDocumentStockMovements ───────────────────────────────────────────

  describe('reverseDocumentStockMovements', () => {
    const makeDoneDelivery = (overrides: Partial<StockMovement> = {}) =>
      makeMovement({
        id: 10,
        movementType: MovementType.DELIVERY,
        status: MovementStatus.DONE,
        sourceWarehouseId: 1,
        destWarehouseId: null,
        quantity: 20,
        origin: 'BL/2026/00042',
        sourceDocumentType: SourceDocumentType.ORDER,
        sourceDocumentId: 42,
        ...overrides,
      });

    beforeEach(() => {
      mockQueryRunner.manager.create.mockImplementation(
        (_E: unknown, d: unknown) => d,
      );
      mockQueryRunner.manager.save.mockImplementation(
        (_E: unknown, d: unknown) => Promise.resolve(d),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
    });

    it('is a no-op when no DONE movements exist for the document', async () => {
      stockMovementRepo.find.mockResolvedValue([]);

      await service.reverseDocumentStockMovements(SourceDocumentType.ORDER, 42);

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('creates a RETURN_IN reversal for each DONE DELIVERY movement', async () => {
      const doneMove = makeDoneDelivery();
      stockMovementRepo.find.mockResolvedValue([doneMove]);
      stockMovementRepo.findOne.mockResolvedValue(null); // reference generation

      const capturedReversals: unknown[] = [];
      mockQueryRunner.manager.create.mockImplementation(
        (_E: unknown, data: unknown) => {
          capturedReversals.push(data);
          return data;
        },
      );

      await service.reverseDocumentStockMovements(SourceDocumentType.ORDER, 42);

      const reversal = capturedReversals.find(
        (d: any) => d.movementType === MovementType.RETURN_IN,
      ) as any;
      expect(reversal).toBeDefined();
      expect(reversal?.quantity).toBe(20);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('swaps source and destination warehouses in the reversal', async () => {
      // Original: RECEIPT destWarehouseId=1, sourceWarehouseId=null
      const receiptMove = makeDoneDelivery({
        movementType: MovementType.RECEIPT,
        sourceWarehouseId: null,
        destWarehouseId: 1,
      });
      stockMovementRepo.find.mockResolvedValue([receiptMove]);
      stockMovementRepo.findOne.mockResolvedValue(null);

      const capturedReversals: unknown[] = [];
      mockQueryRunner.manager.create.mockImplementation(
        (_E: unknown, data: unknown) => {
          capturedReversals.push(data);
          return data;
        },
      );

      await service.reverseDocumentStockMovements(
        SourceDocumentType.INVOICE,
        7,
      );

      const reversal = capturedReversals.find(
        (d: any) => d.movementType !== undefined,
      ) as any;
      // Reversal of RECEIPT (null→1): reversal is RETURN_OUT (1→null)
      expect(reversal?.sourceWarehouseId).toBe(1); // original destWarehouseId swapped to source
      expect(reversal?.destWarehouseId).toBeNull(); // original sourceWarehouseId (null) swapped to dest
    });

    it('marks original movements as CANCELLED after reversal', async () => {
      const doneMove = makeDoneDelivery();
      stockMovementRepo.find.mockResolvedValue([doneMove]);
      stockMovementRepo.findOne.mockResolvedValue(null);

      await service.reverseDocumentStockMovements(SourceDocumentType.ORDER, 42);

      // Original movement should be saved with CANCELLED status
      const cancelledSave = mockQueryRunner.manager.save.mock.calls.find(
        (call: unknown[]) => {
          const data = call[1] as any;
          return data?.status === MovementStatus.CANCELLED;
        },
      );
      expect(cancelledSave).toBeDefined();
    });

    it('rolls back and re-throws on transaction error', async () => {
      const doneMove = makeDoneDelivery();
      stockMovementRepo.find.mockResolvedValue([doneMove]);
      stockMovementRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB crash'));

      await expect(
        service.reverseDocumentStockMovements(SourceDocumentType.ORDER, 42),
      ).rejects.toThrow('DB crash');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('handles multiple movements for the same document atomically', async () => {
      const moves = [
        makeDoneDelivery({ id: 10, productId: 1 }),
        makeDoneDelivery({ id: 11, productId: 2 }),
      ];
      stockMovementRepo.find.mockResolvedValue(moves);
      stockMovementRepo.findOne.mockResolvedValue(null);

      await service.reverseDocumentStockMovements(SourceDocumentType.ORDER, 42);

      // commitTransaction called once (single transaction for all movements)
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
