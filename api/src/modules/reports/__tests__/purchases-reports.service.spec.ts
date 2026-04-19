import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PurchasesReportsService } from '../purchases/purchases-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { DatePreset, SalesReportFilterDto } from '../dto/report-filter.dto';

function makeQb(overrides: Record<string, jest.Mock> = {}) {
  const methods = [
    'where', 'andWhere', 'select', 'addSelect',
    'innerJoin', 'leftJoin',
    'groupBy', 'addGroupBy', 'orderBy', 'skip', 'take',
  ];
  const qb: Record<string, jest.Mock> = {};
  methods.forEach((m) => { qb[m] = jest.fn().mockReturnThis(); });
  qb.getRawOne = jest.fn().mockResolvedValue(null);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return { ...qb, ...overrides };
}

const mockOrderRepo = { createQueryBuilder: jest.fn() };

const mockTenantConnService = {
  getRepository: jest.fn().mockReturnValue(mockOrderRepo),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('PurchasesReportsService', () => {
  let service: PurchasesReportsService;
  const defaultFilter: SalesReportFilterDto = { preset: DatePreset.THIS_MONTH, page: 1, perPage: 50 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<PurchasesReportsService>(PurchasesReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getRepository.mockReturnValue(mockOrderRepo);
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
  });

  // ─── getPurchasesByPeriod ────────────────────────────────────────────────────
  describe('getPurchasesByPeriod', () => {
    it('returns correct shape with empty DB', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(makeQb());

      const result = await service.getPurchasesByPeriod(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('meta');
      expect(result.kpis.totalPurchases).toBe(0);
      expect(result.kpis.totalOrders).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('maps purchase rows correctly', async () => {
      const kpiRaw = { totalPurchases: '45000.00', totalOrders: '10', avgOrder: '4500.00' };
      const dailyRaw = [
        { day: '2025-03-05', total: '15000.00', orders: '3' },
        { day: '2025-03-10', total: '30000.00', orders: '7' },
      ];
      const orderRows = [
        { id: 5, documentNumber: 'ACH-001', date: '2025-03-10', total: 30000, supplierName: 'Supplier X', status: 'CONFIRMED' },
      ];

      // getPurchasesByPeriod calls createQueryBuilder 3 times (kpi reuses baseQb, daily + rows are separate)
      // NOTE: the service uses baseQb for kpi, then creates 2 new QBs for daily/rows
      mockOrderRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ getRawOne: jest.fn().mockResolvedValue(kpiRaw) }))
        .mockReturnValueOnce(makeQb({ getRawMany: jest.fn().mockResolvedValue(dailyRaw) }))
        .mockReturnValueOnce(makeQb({ getManyAndCount: jest.fn().mockResolvedValue([orderRows, 1]) }));

      const result = await service.getPurchasesByPeriod(defaultFilter);

      expect(result.kpis.totalPurchases).toBe(45000);
      expect(result.kpis.avgOrder).toBe(4500);
      expect(result.chart.labels).toEqual(['2025-03-05', '2025-03-10']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].supplier).toBe('Supplier X');
    });

    it('serves from cache on second call', async () => {
      const cached = { kpis: {}, chart: {}, rows: [], meta: {} };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.getPurchasesByPeriod(defaultFilter);
      expect(result).toBe(cached);
      expect(mockOrderRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ─── getTopSuppliers ─────────────────────────────────────────────────────────
  describe('getTopSuppliers', () => {
    it('returns empty chart series when no suppliers', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue([]),
      }));

      const result = await service.getTopSuppliers(defaultFilter);

      expect(result.kpis.uniqueSuppliers).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('maps supplier rows with numbers', async () => {
      const rows = [
        { supplierId: 2, supplierName: 'Supplier A', orderCount: '4', totalPurchases: '80000.00', avgOrder: '20000.00' },
      ];
      mockOrderRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue(rows),
      }));

      const result = await service.getTopSuppliers(defaultFilter);

      expect(result.rows[0].totalPurchases).toBe(80000);
      expect(result.rows[0].orderCount).toBe(4);
    });
  });

  // ─── getPurchasesByProduct ────────────────────────────────────────────────────
  describe('getPurchasesByProduct', () => {
    it('returns correct shape', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue([]),
      }));

      const result = await service.getPurchasesByProduct(defaultFilter);
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('kpis');
      expect(result.rows).toEqual([]);
    });
  });
});
