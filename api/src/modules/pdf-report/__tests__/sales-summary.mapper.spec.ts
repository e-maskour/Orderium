import { SalesSummaryMapper } from '../reports/sales-summary/sales-summary.mapper';
import { SalesSummaryData } from '../reports/sales-summary/sales-summary.types';
import { createReportFormatter } from '../core/report-formatter';
import { resolveReportConfig } from '../core/resolve-report-config';
import {
  KpiGridBlock,
  ReportMapperContext,
  SectionBlock,
  TableBlock,
} from '../types';

/** Builds a mapper context with the module defaults (fr-MA / MAD). */
function buildContext(): ReportMapperContext {
  const config = resolveReportConfig({
    reportType: 'sales-summary',
    branding: { companyName: 'Acme SARL' },
    generatedAt: new Date('2026-02-01T10:00:00Z'),
  });

  return {
    config,
    format: createReportFormatter({
      locale: config.locale,
      currency: config.currency,
      timeZone: config.timeZone,
    }),
  };
}

function baseData(): SalesSummaryData {
  return {
    period: {
      from: '2026-01-01',
      to: '2026-01-31',
      label: 'Janvier 2026',
    },
    kpis: { totalRevenue: 125_400.5, totalOrders: 42, avgOrder: 2985.72 },
    orders: [
      {
        reference: 'CMD-001',
        date: '2026-01-05',
        customer: 'Client A',
        total: 1200,
        status: 'PAID',
      },
      {
        reference: 'CMD-002',
        date: '2026-01-09',
        customer: 'Client B',
        total: 800.5,
        status: 'PENDING',
      },
    ],
  };
}

describe('SalesSummaryMapper', () => {
  let mapper: SalesSummaryMapper;
  let ctx: ReportMapperContext;

  beforeEach(() => {
    mapper = new SalesSummaryMapper();
    ctx = buildContext();
  });

  it('registers under the sales-summary report type', () => {
    expect(mapper.reportType).toBe('sales-summary');
  });

  it('produces a KPI grid followed by the orders section', () => {
    const doc = mapper.map(baseData(), ctx);

    expect(doc.blocks[0].kind).toBe('kpi-grid');
    expect(doc.blocks[1].kind).toBe('section');
    expect((doc.blocks[1] as SectionBlock).title).toBe('Détail des commandes');
  });

  it('puts the reporting period in the subtitle', () => {
    const doc = mapper.map(baseData(), ctx);

    expect(doc.subtitle).toContain('Janvier 2026');
    expect(doc.subtitle).toContain('01/01/2026');
    expect(doc.subtitle).toContain('31/01/2026');
  });

  it('maps KPIs to cards with the right formats', () => {
    const grid = mapper.map(baseData(), ctx).blocks[0] as KpiGridBlock;

    expect(grid.cards).toHaveLength(3);
    expect(grid.cards[0]).toMatchObject({
      label: 'Chiffre d’affaires',
      value: 125_400.5,
      format: 'currency',
    });
    expect(grid.cards[0].hint).toBe('42 commande(s)');
    expect(grid.cards[1]).toMatchObject({ value: 42, format: 'integer' });
    expect(grid.cards[2]).toMatchObject({ value: 2985.72, format: 'currency' });
  });

  it('adds a signed evolution card when a change percentage is supplied', () => {
    const data = baseData();
    data.kpis.revenueChangePercent = -8.25;

    const grid = mapper.map(data, ctx).blocks[0] as KpiGridBlock;
    const evolution = grid.cards[3];

    expect(evolution.label).toBe('Évolution');
    expect(evolution.delta?.tone).toBe('negative');
    expect(evolution.delta?.value.startsWith('+')).toBe(false);
  });

  it('marks a positive evolution with a leading plus sign', () => {
    const data = baseData();
    data.kpis.revenueChangePercent = 12.5;

    const grid = mapper.map(data, ctx).blocks[0] as KpiGridBlock;

    expect(grid.cards[3].delta).toEqual({
      value: expect.stringContaining('+') as string,
      tone: 'positive',
    });
  });

  it('sums order totals into the table totals row', () => {
    const section = mapper.map(baseData(), ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.rows).toHaveLength(2);
    expect(table.totals).toEqual({ total: 2000.5 });
    expect(table.totalsLabel).toBe('Total période');
  });

  it('coerces string decimals coming from SQL aggregates', () => {
    const data = baseData();
    // TypeORM returns numeric columns as strings on raw queries.
    data.orders[0].total = '1200.00' as unknown as number;

    const section = mapper.map(data, ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.totals).toEqual({ total: 2000.5 });
    expect(table.rows[0].total).toBe(1200);
  });

  it('omits the channel column when no order carries one', () => {
    const section = mapper.map(baseData(), ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.columns.map((c) => c.key)).not.toContain('channel');
  });

  it('includes the channel column as soon as one order has a channel', () => {
    const data = baseData();
    data.orders[1].channel = 'CLIENT_POS';

    const section = mapper.map(data, ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.columns.map((c) => c.key)).toContain('channel');
  });

  it('tones status badges by order status', () => {
    const section = mapper.map(baseData(), ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;
    const statusColumn = table.columns.find((c) => c.key === 'status');

    expect(statusColumn?.badgeTone?.('PAID', {})).toBe('positive');
    expect(statusColumn?.badgeTone?.('pending', {})).toBe('warning');
    expect(statusColumn?.badgeTone?.('CANCELLED', {})).toBe('negative');
    expect(statusColumn?.badgeTone?.('SOMETHING_ELSE', {})).toBe('neutral');
  });

  it('notes truncation when the payload is a page of a larger set', () => {
    const data = baseData();
    data.totalOrderCount = 42;

    const section = mapper.map(data, ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.note).toBe('2 commande(s) affichée(s) sur 42.');
  });

  it('leaves the note empty when every row is included', () => {
    const data = baseData();
    data.totalOrderCount = 2;

    const section = mapper.map(data, ctx).blocks[1] as SectionBlock;

    expect((section.blocks[0] as TableBlock).note).toBeUndefined();
  });

  it('renders an empty-state message instead of an empty table', () => {
    const data = baseData();
    data.orders = [];

    const section = mapper.map(data, ctx).blocks[1] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(table.rows).toHaveLength(0);
    expect(table.emptyMessage).toBe(
      'Aucune commande sur la période sélectionnée.',
    );
  });

  it('skips the best-sellers section when no products are supplied', () => {
    const doc = mapper.map(baseData(), ctx);

    expect(doc.blocks).toHaveLength(2);
  });

  it('adds a best-sellers section with totals when products are supplied', () => {
    const data = baseData();
    data.topProducts = [
      { product: 'Produit A', quantity: 10, revenue: 5000, sharePercent: 62.5 },
      { product: 'Produit B', quantity: 4, revenue: 3000, sharePercent: 37.5 },
    ];

    const doc = mapper.map(data, ctx);
    const section = doc.blocks[2] as SectionBlock;
    const table = section.blocks[0] as TableBlock;

    expect(section.title).toBe('Meilleures ventes');
    expect(table.columns.map((c) => c.key)).toContain('sharePercent');
    expect(table.totals).toEqual({ quantity: 14, revenue: 8000 });
  });

  it('drops the share column when no product reports a share', () => {
    const data = baseData();
    data.topProducts = [{ product: 'Produit A', quantity: 10, revenue: 5000 }];

    const doc = mapper.map(data, ctx);
    const table = (doc.blocks[2] as SectionBlock).blocks[0] as TableBlock;

    expect(table.columns.map((c) => c.key)).not.toContain('sharePercent');
  });
});
