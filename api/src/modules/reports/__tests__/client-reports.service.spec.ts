import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ClientReportsService } from '../partners/client-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import {
  DatePreset,
  ReportFilterDto,
  AgingReportFilterDto,
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

const mockPartnerRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn().mockResolvedValue(null),
};
const mockOrderRepo = { createQueryBuilder: jest.fn() };
const mockInvoiceRepo = { createQueryBuilder: jest.fn() };
const mockPaymentRepo = { createQueryBuilder: jest.fn() };

const mockTenantConnService = {
  getRepository: jest.fn(),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('ClientReportsService', () => {
  let service: ClientReportsService;
  const defaultFilter: ReportFilterDto = {
    preset: DatePreset.THIS_MONTH,
    page: 1,
    perPage: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ClientReportsService>(ClientReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    // Route getRepository to the right mock based on entity class name
    mockTenantConnService.getRepository.mockImplementation(
      (entity: new (...args: unknown[]) => unknown) => {
        switch (entity.name) {
          case 'Partner':
            return mockPartnerRepo;
          case 'Invoice':
            return mockInvoiceRepo;
          case 'Payment':
            return mockPaymentRepo;
          default:
            return mockOrderRepo; // Order
        }
      },
    );
  });

  // ─── getTopCustomers ─────────────────────────────────────────────────────────
  describe('getTopCustomers', () => {
    it('returns correct shape with empty DB', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getTopCustomers(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result.kpis.uniqueCustomers).toBe(0);
      expect(result.kpis.totalRevenue).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('maps top customers correctly', async () => {
      const rawRows = [
        {
          customerId: 1,
          customerName: 'Client A',
          orderCount: '8',
          totalRevenue: '40000.00',
          avgOrder: '5000.00',
        },
        {
          customerId: 2,
          customerName: 'Client B',
          orderCount: '4',
          totalRevenue: '20000.00',
          avgOrder: '5000.00',
        },
      ];
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getTopCustomers(defaultFilter);

      expect(result.kpis.uniqueCustomers).toBe(2);
      expect(result.kpis.totalRevenue).toBe(60000);
      expect(result.kpis.topCustomer).toBe('Client A');
      expect(result.rows[0].totalRevenue).toBe(40000);
    });

    it('applies pagination correctly', async () => {
      const rawRows = Array.from({ length: 10 }, (_, i) => ({
        customerId: i + 1,
        customerName: `Client ${i}`,
        orderCount: '1',
        totalRevenue: `${(10 - i) * 1000}.00`,
        avgOrder: '1000.00',
      }));
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawRows),
        }),
      );

      const result = await service.getTopCustomers({
        ...defaultFilter,
        page: 2,
        perPage: 3,
      });
      expect(result.rows).toHaveLength(3);
      expect(result.meta.total).toBe(10);
    });
  });

  // ─── getCustomerAging ────────────────────────────────────────────────────────
  describe('getCustomerAging', () => {
    const agingFilter: AgingReportFilterDto = {};

    it('returns correct shape with no outstanding invoices', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getCustomerAging(agingFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result.kpis.totalCreances).toBe(0);
      expect(result.kpis.customers).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('correctly buckets overdue invoices', async () => {
      const now = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - n);
        return d.toISOString();
      };

      const invoices = [
        {
          id: 1,
          customerId: 1,
          customerName: 'Client A',
          dueDate: daysAgo(0),
          date: daysAgo(30),
          remainingAmount: '1000',
        }, // current
        {
          id: 2,
          customerId: 1,
          customerName: 'Client A',
          dueDate: daysAgo(15),
          date: daysAgo(45),
          remainingAmount: '2000',
        }, // 1-30d
        {
          id: 3,
          customerId: 1,
          customerName: 'Client A',
          dueDate: daysAgo(100),
          date: daysAgo(130),
          remainingAmount: '5000',
        }, // 90+
      ];

      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue(invoices),
        }),
      );

      const result = await service.getCustomerAging(agingFilter);

      const clientA = result.rows[0];
      expect(clientA.total).toBeCloseTo(8000, 0);
      expect(clientA.d90plus).toBe(5000);
      expect(result.kpis.over90).toBe(5000);
    });

    it('uses provided asOfDate', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getCustomerAging({ asOfDate: '2025-01-31' });
      expect(result.meta.asOfDate).toBe('2025-01-31');
    });
  });

  // ─── getInactiveCustomers ────────────────────────────────────────────────────
  describe('getInactiveCustomers', () => {
    it('returns correct shape with empty result', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );
      mockPartnerRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getInactiveCustomers(defaultFilter);

      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('kpis');
      expect(result.rows).toEqual([]);
    });
  });

  // ─── getCustomerStatement ────────────────────────────────────────────────────
  describe('getCustomerStatement', () => {
    it('returns rows and kpis for a given partnerId', async () => {
      mockOrderRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );
      mockPaymentRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getCustomerStatement({ partnerId: 1 });
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('kpis');
    });
  });
});
