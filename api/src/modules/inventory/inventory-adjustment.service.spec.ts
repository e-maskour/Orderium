import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import {
  InventoryAdjustment,
  AdjustmentLine,
  AdjustmentStatus,
} from './entities/inventory-adjustment.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockService } from './stock.service';

// ─── Mock Factories ───────────────────────────────────────────────────────────

const makeQueryBuilderMock = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
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

const mockStockService = {
  updateStockQuant: jest.fn(),
  getStockAtWarehouse: jest.fn(),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: { save: jest.fn() },
};

const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
  query: jest.fn(),
};

// ─── Test Data Factories ─────────────────────────────────────────────────────

const makeWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse =>
  ({
    id: 1,
    name: 'Main Warehouse',
    code: 'WH-001',
    isActive: true,
    ...overrides,
  }) as Warehouse;

const makeProduct = (overrides: any = {}): Product =>
  ({
    id: 1,
    name: 'Widget',
    code: 'WGT-001',
    isEnabled: true,
    ...overrides,
  }) as Product;

const makeAdjustment = (
  overrides: Partial<InventoryAdjustment> = {},
): InventoryAdjustment =>
  ({
    id: 1,
    reference: 'ADJ/2026/00001',
    name: 'Monthly Count',
    warehouseId: 1,
    status: AdjustmentStatus.DRAFT,
    adjustmentDate: null,
    userId: null,
    notes: '',
    lines: [],
    ...overrides,
  }) as InventoryAdjustment;

const makeAdjustmentLine = (
  overrides: Partial<AdjustmentLine> = {},
): AdjustmentLine =>
  ({
    id: 1,
    adjustmentId: 1,
    productId: 1,
    theoreticalQuantity: 100,
    countedQuantity: 95,
    difference: -5,
    ...overrides,
  }) as AdjustmentLine;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InventoryAdjustmentService', () => {
  let service: InventoryAdjustmentService;
  let adjustmentRepo: ReturnType<typeof mockRepository>;
  let adjustmentLineRepo: ReturnType<typeof mockRepository>;
  let warehouseRepo: ReturnType<typeof mockRepository>;
  let productRepo: ReturnType<typeof mockRepository>;

  let _stockMovementRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAdjustmentService,
        {
          provide: getRepositoryToken(InventoryAdjustment),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AdjustmentLine),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(Warehouse), useFactory: mockRepository },
        { provide: getRepositoryToken(Product), useFactory: mockRepository },
        {
          provide: getRepositoryToken(StockMovement),
          useFactory: mockRepository,
        },
        { provide: StockService, useValue: mockStockService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventoryAdjustmentService>(
      InventoryAdjustmentService,
    );
    adjustmentRepo = module.get(getRepositoryToken(InventoryAdjustment));
    adjustmentLineRepo = module.get(getRepositoryToken(AdjustmentLine));
    warehouseRepo = module.get(getRepositoryToken(Warehouse));
    productRepo = module.get(getRepositoryToken(Product));
    _stockMovementRepo = module.get(getRepositoryToken(StockMovement));

    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a DRAFT adjustment without lines', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null); // no prior adjustment for reference
      const saved = makeAdjustment();
      adjustmentRepo.create.mockReturnValue(saved);
      adjustmentRepo.save.mockResolvedValue(saved);

      // findOne called at the end
      jest.spyOn(service, 'findOne').mockResolvedValue(saved);

      const result = await service.create({
        name: 'Monthly Count',
        warehouseId: 1,
      });

      expect(adjustmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AdjustmentStatus.DRAFT }),
      );
      expect(result.status).toBe(AdjustmentStatus.DRAFT);
    });

    it('throws NotFoundException for non-existing warehouse', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Count', warehouseId: 999 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create({ name: 'Count', warehouseId: 999 }),
      ).rejects.toThrow('Warehouse with ID 999 not found');
    });

    it('creates adjustment with lines and calculates difference', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      const saved = makeAdjustment();
      adjustmentRepo.create.mockReturnValue(saved);
      adjustmentRepo.save.mockResolvedValue(saved);
      productRepo.findOne.mockResolvedValue(makeProduct());
      const line = makeAdjustmentLine();
      adjustmentLineRepo.create.mockReturnValue(line);
      adjustmentLineRepo.save.mockResolvedValue(line);

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(makeAdjustment({ lines: [line] }));

      const result = await service.create({
        name: 'Count',
        warehouseId: 1,
        lines: [
          { productId: 1, theoreticalQuantity: 100, countedQuantity: 95 },
        ],
      });

      expect(adjustmentLineRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ difference: -5 }),
      );
      expect(result.lines).toHaveLength(1);
    });

    it('throws NotFoundException when a line product does not exist', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(null); // product not found

      await expect(
        service.create({
          name: 'Count',
          warehouseId: 1,
          lines: [
            { productId: 999, theoreticalQuantity: 10, countedQuantity: 10 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create({
          name: 'Count',
          warehouseId: 1,
          lines: [
            { productId: 999, theoreticalQuantity: 10, countedQuantity: 10 },
          ],
        }),
      ).rejects.toThrow('Product with ID 999 not found');
    });

    it('calculates positive difference correctly', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(makeProduct());
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      adjustmentLineRepo.create.mockImplementation((d) => d);
      adjustmentLineRepo.save.mockImplementation((d) => Promise.resolve(d));

      const capturedLines: any[] = [];
      adjustmentLineRepo.create.mockImplementation((d) => {
        capturedLines.push(d);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return d;
      });

      jest.spyOn(service, 'findOne').mockResolvedValue(makeAdjustment());

      await service.create({
        name: 'Count',
        warehouseId: 1,
        lines: [{ productId: 1, theoreticalQuantity: 50, countedQuantity: 70 }],
      });

      expect(capturedLines[0].difference).toBe(20); // over-count
    });

    it('calculates zero difference correctly', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(makeProduct());

      const capturedLines: any[] = [];
      adjustmentLineRepo.create.mockImplementation((d) => {
        capturedLines.push(d);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return d;
      });
      adjustmentLineRepo.save.mockImplementation((d) => Promise.resolve(d));

      jest.spyOn(service, 'findOne').mockResolvedValue(makeAdjustment());

      await service.create({
        name: 'Count',
        warehouseId: 1,
        lines: [
          { productId: 1, theoreticalQuantity: 100, countedQuantity: 100 },
        ],
      });

      expect(capturedLines[0].difference).toBe(0);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns an existing adjustment', async () => {
      const adjustment = makeAdjustment();
      adjustmentRepo.findOne.mockResolvedValue(adjustment);

      const result = await service.findOne(1);

      expect(adjustmentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result).toEqual(adjustment);
    });

    it('throws NotFoundException for non-existing adjustment', async () => {
      adjustmentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Inventory adjustment with ID 999 not found',
      );
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      adjustmentRepo._qb.getMany.mockResolvedValue([makeAdjustment()]);
    });

    it('returns all adjustments without filters', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(1);
    });

    it('applies warehouseId filter', async () => {
      await service.findAll({ warehouseId: 2 });

      expect(adjustmentRepo._qb.andWhere).toHaveBeenCalledWith(
        'adjustment.warehouseId = :warehouseId',
        { warehouseId: 2 },
      );
    });

    it('applies status filter', async () => {
      await service.findAll({ status: AdjustmentStatus.DONE });

      expect(adjustmentRepo._qb.andWhere).toHaveBeenCalledWith(
        'adjustment.status = :status',
        { status: AdjustmentStatus.DONE },
      );
    });

    it('applies date range filters', async () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-03-31');

      await service.findAll({ startDate: start, endDate: end });

      expect(adjustmentRepo._qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateCreated >= :startDate'),
        { startDate: start },
      );
      expect(adjustmentRepo._qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateCreated <= :endDate'),
        { endDate: end },
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates name and notes on a DRAFT adjustment', async () => {
      const adjustment = makeAdjustment({ status: AdjustmentStatus.DRAFT });
      adjustmentRepo.findOne.mockResolvedValue(adjustment);
      adjustmentRepo.save.mockImplementation((a) => Promise.resolve(a));

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(adjustment)
        .mockResolvedValueOnce(
          makeAdjustment({ name: 'Updated Name', notes: 'new notes' }),
        );

      const result = await service.update(1, {
        name: 'Updated Name',
        notes: 'new notes',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('throws BadRequestException when updating a DONE adjustment', async () => {
      const adjustment = makeAdjustment({ status: AdjustmentStatus.DONE });
      adjustmentRepo.findOne.mockResolvedValue(adjustment);

      await expect(service.update(1, { name: 'X' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, { name: 'X' })).rejects.toThrow(
        'Cannot update validated adjustment',
      );
    });
  });

  // ─── Adjustment Logic & Edge Cases ───────────────────────────────────────────

  describe('adjustment logic edge cases', () => {
    it('handles lines with fractional quantities correctly', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(makeProduct());

      const capturedLines: any[] = [];
      adjustmentLineRepo.create.mockImplementation((d) => {
        capturedLines.push(d);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return d;
      });
      adjustmentLineRepo.save.mockImplementation((d) => Promise.resolve(d));

      jest.spyOn(service, 'findOne').mockResolvedValue(makeAdjustment());

      await service.create({
        name: 'Fractional Count',
        warehouseId: 1,
        lines: [
          { productId: 1, theoreticalQuantity: 10.5, countedQuantity: 10.25 },
        ],
      });

      expect(capturedLines[0].difference).toBeCloseTo(-0.25);
    });

    it('records a counted quantity of zero (full shortage)', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(makeProduct());

      const capturedLines: any[] = [];
      adjustmentLineRepo.create.mockImplementation((d) => {
        capturedLines.push(d);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return d;
      });
      adjustmentLineRepo.save.mockImplementation((d) => Promise.resolve(d));

      jest.spyOn(service, 'findOne').mockResolvedValue(makeAdjustment());

      await service.create({
        name: 'Zero Count',
        warehouseId: 1,
        lines: [{ productId: 1, theoreticalQuantity: 100, countedQuantity: 0 }],
      });

      expect(capturedLines[0].difference).toBe(-100);
    });

    it('handles large counted quantity (surplus)', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      adjustmentRepo.findOne.mockResolvedValue(null);
      adjustmentRepo.create.mockReturnValue(makeAdjustment());
      adjustmentRepo.save.mockResolvedValue(makeAdjustment());
      productRepo.findOne.mockResolvedValue(makeProduct());

      const capturedLines: any[] = [];
      adjustmentLineRepo.create.mockImplementation((d) => {
        capturedLines.push(d);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return d;
      });
      adjustmentLineRepo.save.mockImplementation((d) => Promise.resolve(d));

      jest.spyOn(service, 'findOne').mockResolvedValue(makeAdjustment());

      await service.create({
        name: 'Surplus Count',
        warehouseId: 1,
        lines: [
          { productId: 1, theoreticalQuantity: 0, countedQuantity: 9999 },
        ],
      });

      expect(capturedLines[0].difference).toBe(9999);
    });
  });
});
