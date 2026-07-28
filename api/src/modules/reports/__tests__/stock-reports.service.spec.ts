import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { StockReportsService } from '../stock/stock-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import {
  DatePreset,
  StockReportFilterDto,
  ReportFilterDto,
} from '../dto/report-filter.dto';

function makeQb(overrides: Record<string, jest.Mock> = {}) {
  const methods = [
    'where',
    'andWhere',
    'select',
    'addSelect',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'skip',
    'take',
  ];
  const qb: Record<string, jest.Mock> = {};
  methods.forEach((m) => {
    qb[m] = jest.fn().mockReturnThis();
  });
  qb.getRawOne = jest.fn().mockResolvedValue(null);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getMany = jest.fn().mockResolvedValue([]);
  return { ...qb, ...overrides };
}

const mockStockQuantRepo = { createQueryBuilder: jest.fn() };
const mockStockMovementRepo = { createQueryBuilder: jest.fn() };
const mockWarehouseRepo = {
  createQueryBuilder: jest.fn(),
  findByIds: jest.fn().mockResolvedValue([]),
};
const mockProductRepo = {
  createQueryBuilder: jest.fn(),
  findByIds: jest.fn().mockResolvedValue([]),
};

const mockTenantConnService = {
  getRepository: jest.fn(),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('StockReportsService', () => {
  let service: StockReportsService;
  const defaultFilter: StockReportFilterDto = {
    preset: DatePreset.THIS_MONTH,
    page: 1,
    perPage: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<StockReportsService>(StockReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    mockTenantConnService.getRepository.mockImplementation(
      (entity: new (...args: unknown[]) => unknown) => {
        switch (entity.name) {
          case 'StockMovement':
            return mockStockMovementRepo;
          case 'Warehouse':
            return mockWarehouseRepo;
          case 'Product':
            return mockProductRepo;
          default:
            return mockStockQuantRepo; // StockQuant
        }
      },
    );
  });

  // ─── getStockValuation ───────────────────────────────────────────────────────
  describe('getStockValuation', () => {
    it('returns correct shape with empty DB', async () => {
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getStockValuation(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('meta');
      expect(result.kpis.totalValuation).toBe(0);
      expect(result.kpis.productCount).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('calculates valuation correctly', async () => {
      const rawRows = [
        {
          productId: 1,
          productName: 'Product A',
          productCode: 'PA',
          warehouseName: 'WH1',
          totalQty: '100',
          cost: '50.00',
          price: '80.00',
        },
        {
          productId: 2,
          productName: 'Product B',
          productCode: 'PB',
          warehouseName: 'WH1',
          totalQty: '50',
          cost: '20.00',
          price: '30.00',
        },
      ];
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getStockValuation(defaultFilter);

      // 100*50 + 50*20 = 5000 + 1000 = 6000
      expect(result.kpis.totalValuation).toBe(6000);
      expect(result.kpis.productCount).toBe(2);
      expect(result.rows[0].valuationCost).toBe(5000);
      expect(result.rows[0].valuationSale).toBe(8000);
      expect(result.kpis.totalQuantity).toBe(150);
    });

    it('filters by warehouseId when provided', async () => {
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      await service.getStockValuation({ ...defaultFilter, warehouseId: 3 });

      const qb = mockStockQuantRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('warehouseId'),
        expect.objectContaining({ wh: 3 }),
      );
    });
  });

  // ─── getLowStock ─────────────────────────────────────────────────────────────
  describe('getLowStock', () => {
    it('returns correct shape with no low-stock items', async () => {
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getLowStock(defaultFilter);

      expect(result.kpis.lowStockCount).toBe(0);
      expect(result.kpis.outOfStockCount).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('labels out-of-stock as "rupture" and low-stock as "alerte"', async () => {
      const rawRows = [
        {
          productId: 1,
          productName: 'P1',
          productCode: 'P1',
          warehouseId: 1,
          warehouseName: 'WH1',
          quantity: '0',
          availableQuantity: '0',
          reservedQuantity: '0',
          threshold: '5',
        },
        {
          productId: 2,
          productName: 'P2',
          productCode: 'P2',
          warehouseId: 1,
          warehouseName: 'WH1',
          quantity: '3',
          availableQuantity: '3',
          reservedQuantity: '0',
          threshold: '5',
        },
      ];
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getLowStock(defaultFilter);

      expect(result.rows[0].urgency).toBe('rupture');
      expect(result.rows[1].urgency).toBe('alerte');
      expect(result.kpis.outOfStockCount).toBe(1);
      expect(result.kpis.alertCount).toBe(1);
    });
  });

  // ─── getMovementsJournal ─────────────────────────────────────────────────────
  describe('getMovementsJournal', () => {
    it('returns correct shape with empty DB', async () => {
      mockStockMovementRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        }),
      );

      const result = await service.getMovementsJournal(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result.kpis.totalMovements).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('resolves product and warehouse names', async () => {
      const movements = [
        {
          id: 1,
          reference: 'MOV-001',
          movementType: 'IN',
          quantity: 50,
          dateDone: '2025-03-01',
          origin: 'PURCHASE',
          productId: 10,
          sourceWarehouseId: null,
          destWarehouseId: 2,
        },
      ];
      mockStockMovementRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getManyAndCount: jest.fn().mockResolvedValue([movements, 1]),
        }),
      );
      mockProductRepo.findByIds.mockResolvedValue([
        { id: 10, name: 'Widget', code: 'WGT' },
      ]);
      mockWarehouseRepo.findByIds.mockResolvedValue([
        { id: 2, name: 'Main WH' },
      ]);

      const result = await service.getMovementsJournal(defaultFilter);

      expect(result.rows[0].productName).toBe('Widget');
      expect(result.rows[0].dest).toBe('Main WH');
      expect(result.rows[0].source).toBe('-');
    });

    it('skips findByIds calls when movement list is empty', async () => {
      mockStockMovementRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        }),
      );

      await service.getMovementsJournal(defaultFilter);

      expect(mockProductRepo.findByIds).not.toHaveBeenCalled();
      expect(mockWarehouseRepo.findByIds).not.toHaveBeenCalled();
    });
  });

  // ─── getSlowDeadStock ────────────────────────────────────────────────────────
  describe('getSlowDeadStock', () => {
    it('returns correct shape', async () => {
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      mockStockMovementRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getSlowDeadStock(defaultFilter);
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('kpis');
    });
  });

  // ─── getStockByWarehouse ─────────────────────────────────────────────────────
  describe('getStockByWarehouse', () => {
    it('returns correct shape', async () => {
      mockStockQuantRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const filter: ReportFilterDto = {
        preset: DatePreset.THIS_MONTH,
        page: 1,
        perPage: 50,
      };
      const result = await service.getStockByWarehouse(filter);
      expect(result).toHaveProperty('rows');
    });
  });
});
