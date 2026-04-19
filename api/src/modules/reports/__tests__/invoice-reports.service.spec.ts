import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InvoiceReportsService } from '../invoices/invoice-reports.service';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import {
  DatePreset,
  InvoiceReportFilterDto,
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

const mockInvoiceRepo = { createQueryBuilder: jest.fn() };
const mockInvoiceItemRepo = { createQueryBuilder: jest.fn() };

const mockTenantConnService = {
  getRepository: jest.fn(),
  getCurrentTenantSlug: jest.fn().mockReturnValue('test-tenant'),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('InvoiceReportsService', () => {
  let service: InvoiceReportsService;

  const defaultFilter: InvoiceReportFilterDto = {
    preset: DatePreset.THIS_MONTH,
    page: 1,
    perPage: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceReportsService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<InvoiceReportsService>(InvoiceReportsService);
    jest.clearAllMocks();
    mockTenantConnService.getCurrentTenantSlug.mockReturnValue('test-tenant');
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    // Route getRepository calls to the appropriate mock repo
    mockTenantConnService.getRepository.mockImplementation(
      (entity: new (...args: unknown[]) => unknown) => {
        if (entity.name === 'InvoiceItem') return mockInvoiceItemRepo;
        return mockInvoiceRepo;
      },
    );
  });

  // ─── getJournalVente ─────────────────────────────────────────────────────────
  describe('getJournalVente', () => {
    it('returns correct shape with empty DB', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(makeQb());

      const result = await service.getJournalVente(defaultFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('meta');
      expect(result.kpis.totalTTC).toBe(0);
      expect(result.kpis.count).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('maps invoice KPIs correctly', async () => {
      const kpiRaw = {
        totalHT: '50000.00',
        totalTVA: '10000.00',
        totalPaid: '30000.00',
        totalRemaining: '20000.00',
        count: '15',
      };
      const invoiceRows = [
        {
          id: 1,
          documentNumber: 'FAC-001',
          date: '2025-03-10',
          customerName: 'Client A',
          subtotal: 40000,
          tax: 8000,
          total: 48000,
          paidAmount: 20000,
          remainingAmount: 28000,
          status: 'PARTIAL',
        },
      ];

      mockInvoiceRepo.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({ getRawOne: jest.fn().mockResolvedValue(kpiRaw) }),
        )
        .mockReturnValueOnce(
          makeQb({
            getManyAndCount: jest.fn().mockResolvedValue([invoiceRows, 1]),
          }),
        );

      const result = await service.getJournalVente(defaultFilter);

      expect(result.kpis.totalTTC).toBe(50000);
      expect(result.kpis.totalTVA).toBe(10000);
      expect(result.kpis.totalRemaining).toBe(20000);
      expect(result.kpis.count).toBe(15);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].customer).toBe('Client A');
    });
  });

  // ─── getJournalAchat ─────────────────────────────────────────────────────────
  describe('getJournalAchat', () => {
    it('returns correct shape with empty DB', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(makeQb());

      const result = await service.getJournalAchat(defaultFilter);

      expect(result.kpis.totalTTC).toBe(0);
      expect(result.kpis.totalTVA).toBe(0);
      expect(result.rows).toEqual([]);
    });
  });

  // ─── getTvaSummary ───────────────────────────────────────────────────────────
  describe('getTvaSummary', () => {
    it('returns all 5 Moroccan TVA rate rows even when DB is empty', async () => {
      mockInvoiceItemRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getTvaSummary(defaultFilter);

      // Morocco has 5 TVA rates: 20, 14, 10, 7, 0
      expect(result.rows).toHaveLength(5);
      expect(result.rows.every((r) => r.venteHT === 0 && r.achatHT === 0)).toBe(
        true,
      );
      expect(result.kpis.tvaAVerser).toBe(0);
    });

    it('pivots TVA rows correctly', async () => {
      const rawItems = [
        {
          taxRate: '20',
          direction: 'VENTE',
          totalHT: '10000.00',
          totalTVA: '2000.00',
        },
        {
          taxRate: '20',
          direction: 'ACHAT',
          totalHT: '5000.00',
          totalTVA: '1000.00',
        },
      ];
      mockInvoiceItemRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: jest.fn().mockResolvedValue(rawItems),
        }),
      );

      const result = await service.getTvaSummary(defaultFilter);

      const rate20 = result.rows.find((r) => r.taxRate === 20);
      expect(rate20).toBeDefined();
      expect(rate20!.venteTVA).toBe(2000);
      expect(rate20!.achatTVA).toBe(1000);
      expect(rate20!.netTVA).toBe(1000);
      expect(result.kpis.tvaAVerser).toBe(1000);
    });
  });

  // ─── getOutstanding ──────────────────────────────────────────────────────────
  describe('getOutstanding', () => {
    const filter: ReportFilterDto = {
      preset: DatePreset.THIS_MONTH,
      page: 1,
      perPage: 50,
    };

    it('returns correct shape with empty DB', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
          getRawOne: jest.fn().mockResolvedValue(null),
        }),
      );

      const result = await service.getOutstanding(filter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('rows');
      expect(result.kpis.totalRemaining).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('counts overdue invoices', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const invoiceRows = [
        {
          id: 1,
          documentNumber: 'FAC-002',
          date: '2025-01-01',
          dueDate: yesterday.toISOString(),
          direction: 'VENTE',
          customerName: 'Client B',
          supplierName: null,
          total: 5000,
          paidAmount: 0,
          remainingAmount: 5000,
          status: 'UNPAID',
        },
      ];

      mockInvoiceRepo.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({
            getManyAndCount: jest.fn().mockResolvedValue([invoiceRows, 1]),
          }),
        )
        .mockReturnValueOnce(
          makeQb({
            getRawOne: jest
              .fn()
              .mockResolvedValue({ totalRemaining: '5000', count: '1' }),
          }),
        );

      const result = await service.getOutstanding(filter);

      expect(result.kpis.overdueCount).toBe(1);
      expect(result.rows[0].reference).toBe('FAC-002');
    });
  });

  // ─── getAgingBalance ─────────────────────────────────────────────────────────
  describe('getAgingBalance', () => {
    const agingFilter: AgingReportFilterDto = {};

    it('returns aging buckets with zeros when DB is empty', async () => {
      mockInvoiceRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getAgingBalance(agingFilter);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('rows');
      expect(result.rows).toEqual([]);
    });
  });
});
