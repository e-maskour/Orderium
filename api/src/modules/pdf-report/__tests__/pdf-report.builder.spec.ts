import { PdfReportBuilder } from '../core/pdf-report.builder';
import { ReportMapperRegistry } from '../core/report-mapper.registry';
import { SalesSummaryMapper } from '../reports/sales-summary/sales-summary.mapper';
import { SalesSummaryData } from '../reports/sales-summary/sales-summary.types';
import {
  PdfApiClient,
  PdfRenderRequest,
  ReportConfig,
  ReportDocument,
  ReportMapper,
  UnknownReportTypeError,
} from '../types';

const PDF_BYTES = Buffer.from('%PDF-1.7 rendered', 'latin1');

/** Captures what the engine would have sent to the PDF API. */
class RecordingApiClient implements PdfApiClient {
  lastRequest?: PdfRenderRequest;

  render(request: PdfRenderRequest): Promise<Buffer> {
    this.lastRequest = request;
    return Promise.resolve(PDF_BYTES);
  }
}

const SALES_DATA: SalesSummaryData = {
  period: { from: '2026-01-01', to: '2026-01-31', label: 'Janvier 2026' },
  kpis: { totalRevenue: 125_400.5, totalOrders: 42, avgOrder: 2985.72 },
  orders: [
    {
      reference: 'CMD-001',
      date: '2026-01-05',
      customer: 'Client A',
      total: 1200,
      status: 'PAID',
    },
  ],
};

function baseConfig(overrides: Partial<ReportConfig> = {}): ReportConfig {
  return {
    reportType: 'sales-summary',
    branding: {
      companyName: 'Acme SARL',
      logo: { url: 'https://cdn.example.test/logo.png', widthPx: 110 },
      address: {
        line1: '12 rue des Fleurs',
        city: 'Casablanca',
        country: 'Maroc',
      },
      contact: { phone: '+212 5 22 00 00 00', email: 'contact@acme.ma' },
      identifiers: { commonCompanyId: '001234567000089', taxId: '45678912' },
    },
    footer: { note: 'Document confidentiel — usage interne.' },
    meta: [{ label: 'Période', value: 'Janvier 2026' }],
    generatedAt: new Date('2026-02-01T09:30:00Z'),
    ...overrides,
  };
}

describe('PdfReportBuilder', () => {
  let client: RecordingApiClient;
  let builder: PdfReportBuilder;

  beforeEach(() => {
    client = new RecordingApiClient();
    const registry = new ReportMapperRegistry([new SalesSummaryMapper()]);
    builder = new PdfReportBuilder(registry, client);
  });

  it('renders a report end to end and returns PDF bytes', async () => {
    const report = await builder.generate(baseConfig(), SALES_DATA);

    expect(report.buffer).toEqual(PDF_BYTES);
    expect(report.contentType).toBe('application/pdf');
    expect(report.byteLength).toBe(PDF_BYTES.length);
    expect(report.fileName).toBe('sales-summary-2026-02-01.pdf');
  });

  it('uses a caller-supplied file name', async () => {
    const report = await builder.generate(
      baseConfig({ fileName: 'Ventes Janvier 2026' }),
      SALES_DATA,
    );

    expect(report.fileName).toBe('Ventes-Janvier-2026.pdf');
  });

  describe('branded header on every page', () => {
    it('sends a header template alongside the document', async () => {
      await builder.generate(baseConfig(), SALES_DATA);
      const header = client.lastRequest?.headerHtml ?? '';

      expect(header).toContain('Acme SARL');
      expect(header).toContain('https://cdn.example.test/logo.png');
      expect(header).toContain('12 rue des Fleurs, Casablanca, Maroc');
      expect(header).toContain('contact@acme.ma');
      expect(header).toContain('ICE: 001234567000089');
      expect(header).toContain('IF: 45678912');
    });

    it('renders a base64 logo as an inline data URI', async () => {
      const config = baseConfig();
      config.branding.logo = { base64: 'AAAA', mimeType: 'image/svg+xml' };

      await builder.generate(config, SALES_DATA);

      expect(client.lastRequest?.headerHtml).toContain(
        'src="data:image/svg+xml;base64,AAAA"',
      );
    });
  });

  describe('footer on every page', () => {
    it('carries the note, generation date and page numbers', async () => {
      await builder.generate(baseConfig(), SALES_DATA);
      const footer = client.lastRequest?.footerHtml ?? '';

      expect(footer).toContain('Document confidentiel');
      expect(footer).toContain('Généré le');
      expect(footer).toContain('class="pageNumber"');
      expect(footer).toContain('class="totalPages"');
    });

    it('drops page numbers when they are switched off', async () => {
      await builder.generate(
        baseConfig({ footer: { showPageNumbers: false } }),
        SALES_DATA,
      );

      expect(client.lastRequest?.footerHtml).not.toContain(
        'class="pageNumber"',
      );
    });

    it('uses CSS page counters under the css-paged strategy', async () => {
      await builder.generate(
        baseConfig({ pageNumbering: 'css-paged' }),
        SALES_DATA,
      );

      const request = client.lastRequest!;
      // Running elements live inside the document, so no separate templates.
      expect(request.headerHtml).toBeUndefined();
      expect(request.footerHtml).toBeUndefined();
      expect(request.html).toContain('class="running-header"');
      expect(request.html).toContain('class="running-footer"');
      expect(request.html).toContain("counter(page) ' sur ' counter(pages)");
    });
  });

  describe('composed document', () => {
    it('includes the title block, criteria chips and report data', async () => {
      await builder.generate(baseConfig(), SALES_DATA);
      const html = client.lastRequest?.html ?? '';

      expect(html).toContain('<h1 class="doc-title">Rapport de ventes</h1>');
      expect(html).toContain('Période');
      expect(html).toContain('CMD-001');
      expect(html).toContain('Client A');
      expect(html).toContain('class="kpi-grid"');
      expect(html).toContain('table class="data zebra"');
    });

    it('escapes tenant data so report content cannot inject markup', async () => {
      const data: SalesSummaryData = {
        ...SALES_DATA,
        orders: [
          {
            ...SALES_DATA.orders[0],
            customer: '<script>alert(1)</script>',
          },
        ],
      };

      await builder.generate(baseConfig(), data);
      const html = client.lastRequest?.html ?? '';

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('applies the page setup to the render request', async () => {
      await builder.generate(
        baseConfig({ page: { format: 'A3', landscape: true } }),
        SALES_DATA,
      );

      expect(client.lastRequest).toMatchObject({
        format: 'A3',
        landscape: true,
        printBackground: true,
      });
    });

    it('lets the caller override the mapper-supplied title', async () => {
      await builder.generate(
        baseConfig({ title: 'Bilan commercial' }),
        SALES_DATA,
      );

      expect(client.lastRequest?.html).toContain('Bilan commercial');
    });
  });

  describe('extensibility', () => {
    /**
     * A second report type: a mapper and nothing else. No change to the
     * builder, the templates, or the API client is required to render it.
     */
    const stockAlertMapper: ReportMapper<{
      items: { sku: string; qty: number }[];
    }> = {
      reportType: 'stock-alert',
      defaultTitle: 'Alertes de stock',
      pagePreference: { landscape: true },
      map: (data): ReportDocument => ({
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'sku', header: 'Référence' },
              { key: 'qty', header: 'Quantité', format: 'integer' },
            ],
            rows: data.items,
          },
        ],
      }),
    };

    it('renders a newly registered report type through the same engine', async () => {
      const registry = new ReportMapperRegistry([new SalesSummaryMapper()]);
      registry.register(stockAlertMapper);
      const extended = new PdfReportBuilder(registry, client);

      const report = await extended.generate(
        { reportType: 'stock-alert', branding: { companyName: 'Acme SARL' } },
        { items: [{ sku: 'SKU-1', qty: 3 }] },
      );

      expect(report.contentType).toBe('application/pdf');
      expect(client.lastRequest?.html).toContain('Alertes de stock');
      expect(client.lastRequest?.html).toContain('SKU-1');
      // Branded header/footer come for free.
      expect(client.lastRequest?.headerHtml).toContain('Acme SARL');
      expect(client.lastRequest?.footerHtml).toContain('class="pageNumber"');
    });

    it("honours the mapper's page preference unless the caller overrides it", async () => {
      const registry = new ReportMapperRegistry([stockAlertMapper]);
      const extended = new PdfReportBuilder(registry, client);
      const payload = { items: [] };

      await extended.generate(
        { reportType: 'stock-alert', branding: { companyName: 'Acme' } },
        payload,
      );
      expect(client.lastRequest?.landscape).toBe(true);

      await extended.generate(
        {
          reportType: 'stock-alert',
          branding: { companyName: 'Acme' },
          page: { landscape: false },
        },
        payload,
      );
      expect(client.lastRequest?.landscape).toBe(false);
    });

    it('rejects an unregistered report type with the list of known types', async () => {
      await expect(
        builder.generate(baseConfig({ reportType: 'nope' }), SALES_DATA),
      ).rejects.toBeInstanceOf(UnknownReportTypeError);
    });
  });
});
