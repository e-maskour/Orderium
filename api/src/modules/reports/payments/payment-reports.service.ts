import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { Payment, PaymentType } from '../../payments/payment.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { ReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000;

@Injectable()
export class PaymentReportsService {
  private readonly logger = new Logger(PaymentReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private get paymentRepo() {
    return this.tenantConnService.getRepository(Payment);
  }

  private cacheKey(suffix: string, filter: object): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:payments:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Cashflow — daily inflows (customerId) vs outflows (supplierId) */
  async getCashflow(filter: ReportFilterDto) {
    const key = this.cacheKey('cashflow', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );

      const daily = await this.paymentRepo
        .createQueryBuilder('p')
        .where('p.paymentDate >= :from AND p.paymentDate <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .select('p.paymentDate', 'day')
        .addSelect(
          'SUM(CASE WHEN p.customerId IS NOT NULL THEN p.amount ELSE 0 END)',
          'inflow',
        )
        .addSelect(
          'SUM(CASE WHEN p.supplierId IS NOT NULL THEN p.amount ELSE 0 END)',
          'outflow',
        )
        .groupBy('p.paymentDate')
        .orderBy('p.paymentDate', 'ASC')
        .getRawMany<{ day: string; inflow: string; outflow: string }>();

      const kpi = {
        totalInflow: daily.reduce((s, r) => s + Number(r.inflow), 0),
        totalOutflow: daily.reduce((s, r) => s + Number(r.outflow), 0),
        netCashflow: 0,
      };
      kpi.netCashflow = kpi.totalInflow - kpi.totalOutflow;

      return {
        kpis: kpi,
        chart: {
          type: 'bar',
          labels: daily.map((r) => r.day),
          series: [
            {
              name: 'Encaissements (MAD)',
              data: daily.map((r) => Number(r.inflow)),
            },
            {
              name: 'Décaissements (MAD)',
              data: daily.map((r) => Number(r.outflow)),
            },
          ],
        },
        rows: daily.map((r) => ({
          period: r.day,
          inflow: Number(r.inflow),
          outflow: Number(r.outflow),
          net: Number(r.inflow) - Number(r.outflow),
        })),
        meta: null,
      };
    });
  }

  /** Payments grouped by payment method */
  async getByMethod(filter: ReportFilterDto) {
    const key = this.cacheKey('by-method', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );

      const raw = await this.paymentRepo
        .createQueryBuilder('p')
        .where('p.paymentDate >= :from AND p.paymentDate <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .select('p.paymentType', 'method')
        .addSelect('COUNT(p.id)', 'count')
        .addSelect('SUM(p.amount)', 'total')
        .groupBy('p.paymentType')
        .orderBy('SUM(p.amount)', 'DESC')
        .getRawMany<{ method: string; count: string; total: string }>();

      const grandTotal = raw.reduce((s, r) => s + Number(r.total), 0);

      return {
        kpis: {
          totalPayments: raw.reduce((s, r) => s + Number(r.count), 0),
          totalAmount: grandTotal,
          topMethod: raw[0]?.method ?? '-',
        },
        chart: {
          type: 'pie',
          labels: raw.map((r) => r.method),
          series: raw.map((r) => Number(r.total)),
        },
        rows: raw.map((r) => ({
          method: r.method,
          count: Number(r.count),
          total: Number(r.total),
          percentage:
            grandTotal > 0
              ? Math.round((Number(r.total) / grandTotal) * 100)
              : 0,
        })),
        meta: null,
      };
    });
  }

  /** Encaissements vs Décaissements per period */
  async getInOutFlow(filter: ReportFilterDto) {
    return this.getCashflow(filter);
  }

  async getCashflowXlsx(filter: ReportFilterDto): Promise<Buffer> {
    const data = await this.getCashflow({
      ...filter,
      page: 1,
      perPage: 10_000,
    });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      data.rows.map((r) => ({
        Période: r.period,
        'Encaissements (MAD)': r.inflow,
        'Décaissements (MAD)': r.outflow,
        'Net (MAD)': r.net,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Cashflow');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
