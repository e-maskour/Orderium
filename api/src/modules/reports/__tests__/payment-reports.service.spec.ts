import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PaymentReportsService } from '../payments/payment-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { DatePreset, ReportFilterDto } from '../dto/report-filter.dto';

function makeQb(overrides: Record<string, jest.Mock> = {}) {
  const methods = [
    'where', 'andWhere', 'select', 'addSelect',
    'groupBy', 'orderBy', 'skip', 'take',
  ];
  const qb: Record<string, jest.Mock> = {};
  methods.forEach((m) => { qb[m] = jest.fn().mockReturnThis(); });
  qb.getRawOne = jest.fn().mockResolvedValue(null);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return { ...qb, ...overrides };
}

const mockPaymentRepo = { createQueryBuilder: jest.fn() };

const mockTenantConnService = {
  getRepository: jest.fn().mockReturnValue(mockPaymentRepo),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentReportsService', () => {
  let service: PaymentReportsService;
  const defaultFilter: ReportFilterDto = { preset: DatePreset.THIS_MONTH, page: 1, perPage: 50 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<PaymentReportsService>(PaymentReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getRepository.mockReturnValue(mockPaymentRepo);
    mockCacheManager.get.mockResolvedValue(null);
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
  });

  // ─── getCashflow ─────────────────────────────────────────────────────────────
  describe('getCashflow', () => {
    it('returns correct shape with empty DB', async () => {
      mockPaymentRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }));

      const result = await service.getCashflow(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('rows');
      expect(result.kpis.totalInflow).toBe(0);
      expect(result.kpis.totalOutflow).toBe(0);
      expect(result.kpis.netCashflow).toBe(0);
    });

    it('calculates netCashflow = inflow - outflow', async () => {
      const dailyRaw = [
        { day: '2025-03-01', inflow: '15000.00', outflow: '8000.00' },
        { day: '2025-03-02', inflow: '5000.00', outflow: '2000.00' },
      ];
      mockPaymentRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ getRawMany: jest.fn().mockResolvedValue(dailyRaw) }))
        .mockReturnValueOnce(makeQb({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) }));

      const result = await service.getCashflow(defaultFilter);

      expect(result.kpis.totalInflow).toBe(20000);
      expect(result.kpis.totalOutflow).toBe(10000);
      expect(result.kpis.netCashflow).toBe(10000);
    });

    it('maps payment rows to direction labels', async () => {
      const paymentRows = [
        { id: 1, paymentDate: '2025-03-01', amount: 5000, paymentType: 'CASH', notes: null, customerId: 10, supplierId: null },
        { id: 2, paymentDate: '2025-03-02', amount: 3000, paymentType: 'TRANSFER', notes: 'Wire', customerId: null, supplierId: 5 },
      ];
      mockPaymentRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ getRawMany: jest.fn().mockResolvedValue([]) }))
        .mockReturnValueOnce(makeQb({ getManyAndCount: jest.fn().mockResolvedValue([paymentRows, 2]) }));

      const result = await service.getCashflow(defaultFilter);

      expect(result.rows[0].direction).toBe('encaissement');
      expect(result.rows[1].direction).toBe('décaissement');
    });
  });

  // ─── getByMethod ─────────────────────────────────────────────────────────────
  describe('getByMethod', () => {
    it('returns top method as dash when empty', async () => {
      mockPaymentRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue([]),
      }));

      const result = await service.getByMethod(defaultFilter);

      expect(result.kpis.topMethod).toBe('-');
      expect(result.kpis.totalAmount).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('maps payment method rows correctly', async () => {
      const raw = [
        { method: 'CASH', count: '20', total: '50000.00' },
        { method: 'TRANSFER', count: '5', total: '20000.00' },
      ];
      mockPaymentRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue(raw),
      }));

      const result = await service.getByMethod(defaultFilter);

      expect(result.kpis.topMethod).toBe('CASH');
      expect(result.kpis.totalAmount).toBe(70000);
      expect(result.kpis.totalPayments).toBe(25);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].percentage).toBe(71); // Math.round((50000/70000)*100)
    });
  });

  // ─── getInOutFlow ─────────────────────────────────────────────────────────────
  describe('getInOutFlow', () => {
    it('returns correct shape', async () => {
      mockPaymentRepo.createQueryBuilder.mockReturnValue(makeQb({
        getRawMany: jest.fn().mockResolvedValue([]),
      }));

      const result = await service.getInOutFlow(defaultFilter);
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('rows');
    });
  });
});
