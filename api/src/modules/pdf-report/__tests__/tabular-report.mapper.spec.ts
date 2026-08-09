import { TabularReportMapper } from '../reports/tabular/tabular-report.mapper';
import { TabularReportPayload } from '../reports/tabular/tabular-report.types';
import { createReportFormatter } from '../core/report-formatter';
import { resolveReportConfig } from '../core/resolve-report-config';
import {
  KpiGridBlock,
  ReportMapperContext,
  SectionBlock,
  TableBlock,
} from '../types';

function buildContext(): ReportMapperContext {
  const config = resolveReportConfig({
    reportType: 'tabular-report',
    branding: { companyName: 'Acme SARL' },
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

function basePayload(): TabularReportPayload {
  return {
    spec: {
      title: 'Top clients',
      columns: [
        { key: 'customerName', header: 'Client' },
        { key: 'orderCount', header: 'Commandes', format: 'integer' },
        {
          key: 'totalRevenue',
          header: 'CA',
          format: 'currency',
          total: true,
        },
      ],
    },
    data: {
      rows: [
        { customerName: 'Client A', orderCount: 4, totalRevenue: 1200 },
        { customerName: 'Client B', orderCount: 2, totalRevenue: 800.5 },
      ],
    },
  };
}

describe('TabularReportMapper', () => {
  let mapper: TabularReportMapper;
  let ctx: ReportMapperContext;

  beforeEach(() => {
    mapper = new TabularReportMapper();
    ctx = buildContext();
  });

  it('registers under the tabular-report type', () => {
    expect(mapper.reportType).toBe('tabular-report');
  });

  it('renders the table directly when no table title is given', () => {
    const doc = mapper.map(basePayload(), ctx);

    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].kind).toBe('table');
    expect(doc.title).toBe('Top clients');
  });

  it('wraps the table in a section when a table title is given', () => {
    const payload = basePayload();
    payload.spec.tableTitle = 'Détail';

    const doc = mapper.map(payload, ctx);
    const section = doc.blocks[0] as SectionBlock;

    expect(section.kind).toBe('section');
    expect(section.title).toBe('Détail');
    expect(section.blocks[0].kind).toBe('table');
  });

  it('carries column presentation through to the table', () => {
    const table = mapper.map(basePayload(), ctx).blocks[0] as TableBlock;

    expect(table.columns.map((c) => c.key)).toEqual([
      'customerName',
      'orderCount',
      'totalRevenue',
    ]);
    expect(table.columns[1].format).toBe('integer');
    expect(table.rows).toHaveLength(2);
  });

  it('sums only the columns flagged as totals', () => {
    const table = mapper.map(basePayload(), ctx).blocks[0] as TableBlock;

    expect(table.totals).toEqual({ totalRevenue: 2000.5 });
  });

  it('coerces string decimals when summing totals', () => {
    const payload = basePayload();
    payload.data.rows[0].totalRevenue = '1200.00';

    const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

    expect(table.totals).toEqual({ totalRevenue: 2000.5 });
  });

  it('omits the totals row when no column asks for one', () => {
    const payload = basePayload();
    payload.spec.columns = payload.spec.columns.map((c) => ({
      ...c,
      total: false,
    }));

    const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

    expect(table.totals).toBeUndefined();
  });

  describe('KPIs', () => {
    it('resolves KPI values from the report data, not the spec', () => {
      const payload = basePayload();
      payload.spec.kpis = [
        { key: 'totalRevenue', label: 'CA total', format: 'currency' },
        { key: 'totalOrders', label: 'Commandes', format: 'integer' },
      ];
      payload.data.kpis = { totalRevenue: 2000.5, totalOrders: 6 };

      const grid = mapper.map(payload, ctx).blocks[0] as KpiGridBlock;

      expect(grid.kind).toBe('kpi-grid');
      expect(grid.cards).toEqual([
        {
          label: 'CA total',
          value: 2000.5,
          format: 'currency',
          hint: undefined,
        },
        { label: 'Commandes', value: 6, format: 'integer', hint: undefined },
      ]);
    });

    it('skips KPIs the report data does not provide', () => {
      const payload = basePayload();
      payload.spec.kpis = [
        { key: 'totalRevenue', label: 'CA total' },
        { key: 'missing', label: 'Absent' },
      ];
      payload.data.kpis = { totalRevenue: 2000.5 };

      const grid = mapper.map(payload, ctx).blocks[0] as KpiGridBlock;

      expect(grid.cards).toHaveLength(1);
      expect(grid.cards[0].label).toBe('CA total');
    });

    it('emits no KPI grid when the report has no KPI data', () => {
      const payload = basePayload();
      payload.spec.kpis = [{ key: 'totalRevenue', label: 'CA total' }];

      const doc = mapper.map(payload, ctx);

      expect(doc.blocks.every((b) => b.kind !== 'kpi-grid')).toBe(true);
    });
  });

  describe('badges', () => {
    it('maps values to tones case-insensitively', () => {
      const payload = basePayload();
      payload.spec.columns.push({
        key: 'status',
        header: 'Statut',
        badgeMap: { PAID: 'positive', CANCELLED: 'negative' },
      });

      const table = mapper.map(payload, ctx).blocks[0] as TableBlock;
      const statusColumn = table.columns.find((c) => c.key === 'status');

      expect(statusColumn?.badgeTone?.('paid', {})).toBe('positive');
      expect(statusColumn?.badgeTone?.('CANCELLED', {})).toBe('negative');
      expect(statusColumn?.badgeTone?.('UNKNOWN', {})).toBe('neutral');
    });

    it('leaves columns without a badge map unbadged', () => {
      const table = mapper.map(basePayload(), ctx).blocks[0] as TableBlock;

      expect(table.columns[0].badgeTone).toBeUndefined();
    });
  });

  describe('truncation', () => {
    it('warns on the document when the export is capped', () => {
      const payload = basePayload();
      payload.totalRowCount = 4210;

      const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

      // Compare against the formatter's own output — the fr-MA group separator
      // is a narrow no-break space, not a plain one.
      expect(table.note).toContain(ctx.format.integer(4210));
      expect(table.note).toContain('tronqué');
    });

    it('stays silent when every row is included', () => {
      const payload = basePayload();
      payload.totalRowCount = 2;

      const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

      expect(table.note).toBeUndefined();
    });

    it('keeps the caller note alongside the truncation warning', () => {
      const payload = basePayload();
      payload.spec.note = 'Hors taxes.';
      payload.totalRowCount = 4210;

      const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

      expect(table.note).toContain('Hors taxes.');
      expect(table.note).toContain('tronqué');
    });
  });

  it('renders an empty result set with the caller’s message', () => {
    const payload = basePayload();
    payload.data.rows = [];
    payload.spec.emptyMessage = 'Aucun client sur la période.';

    const table = mapper.map(payload, ctx).blocks[0] as TableBlock;

    expect(table.rows).toHaveLength(0);
    expect(table.emptyMessage).toBe('Aucun client sur la période.');
  });
});
