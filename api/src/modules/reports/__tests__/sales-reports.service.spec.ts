import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SalesReportsService } from '../sales/sales-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { DatePreset, SalesReportFilterDto } from '../dto/report-filter.dto';

// ─── Chainable QB mock ─────────────────────────────────────────────────────────
function makeQb(overrides: Record<string, jest.Mock> = {}) {
  const methods = [
    'where',
    'andWhere',
    'orWhere',
    'select',
    'addSelect',
    'innerJoin',
    'leftJoin',
    'leftJoinAndSelect',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'addOrderBy',
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

const mockOrderRepo = { createQueryBuilder: jest.fn() };

const mockTenantConnService = {
  getRepository: jest.fn().mockReturnValue(mockOrderRepo),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('SalesReportsService', () => {
  let service: SalesReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<SalesReportsService>(SalesReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getRepository.mockReturnValue(mockOrderRepo);
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
  });

  const defaultFilter: SalesReportFilterDto = {
    preset: DatePreset.THIS_MONTH,
    page: 1,
    perPage: 50,
  };

  // ─── getRevenueReport ────────────────────────────────────────────────────────
  describe('getRevenueReport', () => {
    it('returns correct shape with empty DB', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawOne: jest.fn().mockResolvedValue(null),
          getRawMany: jest.fn().mockResolvedValue([]),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        }),
      );

      const result = await service.getRevenueReport(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('meta');
      expect(result.kpis.totalRevenue).toBe(0);
      expect(result.kpis.totalOrders).toBe(0);
      expect(result.kpis.avgOrder).toBe(0);
      expect(result.rows).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('maps DB rows to correct shape', async () => {
      const kpiRaw = {
        totalRevenue: '12500.00',
        totalOrders: '5',
        avgOrder: '2500.00',
      };
      const dailyRaw = [
        { day: '2025-03-01', revenue: '5000.00', orders: '2' },
        { day: '2025-03-02', revenue: '7500.00', orders: '3' },
      ];
      const orderRows = [
        {
          id: 1,
          documentNumber: 'CMD-001',
          orderNumber: null,
          date: '2025-03-02',
          total: 7500,
          customerName: 'Client A',
          status: 'CONFIRMED',
          originType: 'BACKOFFICE',
        },
      ];

      // createQueryBuilder is called 3 times: kpi, daily, table
      mockOrderRepo.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({ getRawOne: jest.fn().mockResolvedValue(kpiRaw) }),
        )
        .mockReturnValueOnce(
          makeQb({ getRawMany: jest.fn().mockResolvedValue(dailyRaw) }),
        )
        .mockReturnValueOnce(
          makeQb({
            getManyAndCount: jest.fn().mockResolvedValue([orderRows, 1]),
          }),
        );

      const result = await service.getRevenueReport(defaultFilter);

      expect(result.kpis.totalRevenue).toBe(12500);
      expect(result.kpis.totalOrders).toBe(5);
      expect(result.chart.labels).toEqual(['2025-03-01', '2025-03-02']);
      expect(result.chart.series[0].data).toEqual([5000, 7500]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].customer).toBe('Client A');
      expect(result.meta.total).toBe(1);
    });

    it('returns cached result without hitting the DB', async () => {
      const cached = {
        kpis: { totalRevenue: 999 },
        chart: {},
        rows: [],
        meta: {},
      };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.getRevenueReport(defaultFilter);

      expect(result).toBe(cached);
      expect(mockOrderRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('works with originType filter', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawOne: jest.fn().mockResolvedValue({
            totalRevenue: '100',
            totalOrders: '1',
            avgOrder: '100',
          }),
          getRawMany: jest.fn().mockResolvedValue([]),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        }),
      );

      const filter = { ...defaultFilter, originType: 'CLIENT_POS' };
      await expect(service.getRevenueReport(filter)).resolves.not.toThrow();
    });

    it('uses custom date range', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(makeQb());

      const filter: SalesReportFilterDto = {
        preset: DatePreset.CUSTOM,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };
      await expect(service.getRevenueReport(filter)).resolves.not.toThrow();
    });
  });

  // ─── getTopProducts ──────────────────────────────────────────────────────────
  describe('getTopProducts', () => {
    it('returns correct shape with empty result', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getTopProducts(defaultFilter);

      expect(result.kpis.uniqueProducts).toBe(0);
      expect(result.kpis.topProduct).toBe('-');
      expect(result.kpis.topRevenue).toBe(0);
      expect(result.rows).toEqual([]);
      expect(result.chart.series[0].data).toEqual([]);
    });

    it('maps product rows correctly', async () => {
      const rawRows = [
        {
          productId: 10,
          productName: 'Widget A',
          productCode: 'WGT-A',
          totalQty: '50',
          totalRevenue: '2500.00',
          orderCount: '8',
        },
        {
          productId: 11,
          productName: 'Widget B',
          productCode: 'WGT-B',
          totalQty: '30',
          totalRevenue: '1500.00',
          orderCount: '5',
        },
      ];
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getTopProducts(defaultFilter);

      expect(result.kpis.uniqueProducts).toBe(2);
      expect(result.kpis.topProduct).toBe('Widget A');
      expect(result.kpis.topRevenue).toBe(2500);
      expect(result.rows[0].totalRevenue).toBe(2500);
      expect(result.rows[1].totalQty).toBe(30);
    });

    it('applies pagination correctly', async () => {
      const rawRows = Array.from({ length: 5 }, (_, i) => ({
        productId: i + 1,
        productName: `P${i}`,
        productCode: `C${i}`,
        totalQty: '10',
        totalRevenue: `${(5 - i) * 100}.00`,
        orderCount: '1',
      }));
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getTopProducts({
        ...defaultFilter,
        page: 2,
        perPage: 2,
      });
      expect(result.rows).toHaveLength(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.page).toBe(2);
    });
  });

  // ─── getSalesByCustomer ──────────────────────────────────────────────────────
  describe('getSalesByCustomer', () => {
    it('returns correct shape with empty result', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getSalesByCustomer(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result.rows).toEqual([]);
    });

    it('maps customer rows correctly', async () => {
      const rawRows = [
        {
          customerId: 1,
          customerName: 'Client X',
          orderCount: '5',
          totalRevenue: '10000.00',
          avgOrder: '2000.00',
        },
      ];
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getSalesByCustomer(defaultFilter);

      expect(result.kpis.uniqueCustomers).toBe(1);
      expect(result.rows[0].customerName).toBe('Client X');
      expect(result.rows[0].totalRevenue).toBe(10000);
    });
  });

  // ─── getSalesByCategory ──────────────────────────────────────────────────────
  describe('getSalesByCategory', () => {
    it('returns correct shape', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getSalesByCategory(defaultFilter);
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('kpis');
    });
  });

  // ─── getSalesByPos ───────────────────────────────────────────────────────────
  describe('getSalesByPos', () => {
    it('returns correct shape', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getSalesByPos(defaultFilter);
      expect(result).toHaveProperty('rows');
    });
  });
});
