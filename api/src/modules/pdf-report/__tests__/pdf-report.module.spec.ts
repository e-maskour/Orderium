import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PdfReportModule } from '../pdf-report.module';
import { PdfReportService } from '../pdf-report.service';
import { PlaywrightPdfApiClient } from '../core/playwright-pdf.client';
import { SalesSummaryData } from '../reports/sales-summary/sales-summary.types';
import { PDF_API_CLIENT, UnknownReportTypeError } from '../types';

const DATA: SalesSummaryData = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  kpis: { totalRevenue: 100, totalOrders: 1, avgOrder: 100 },
  orders: [
    {
      reference: 'CMD-1',
      date: '2026-01-04',
      customer: 'Client A',
      total: 100,
      status: 'PAID',
    },
  ],
};

describe('PdfReportModule', () => {
  let moduleRef: TestingModule;
  let service: PdfReportService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      // `ignoreEnvFile` proves the module needs no PDF_API_* configuration:
      // rendering is in-process, not a vendor call.
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), PdfReportModule],
    }).compile();
    service = moduleRef.get(PdfReportService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('boots without any PDF_API_* configuration', () => {
    expect(service).toBeInstanceOf(PdfReportService);
  });

  it('renders locally with Chromium rather than calling a vendor API', () => {
    expect(moduleRef.get(PDF_API_CLIENT)).toBeInstanceOf(
      PlaywrightPdfApiClient,
    );
  });

  it('registers the bundled report types', () => {
    expect(service.availableReports()).toEqual([
      'sales-summary',
      'tabular-report',
    ]);
  });

  it('renders an HTML preview with the branded header and footer inline', () => {
    const html = service.renderHtml(
      {
        reportType: 'sales-summary',
        branding: {
          companyName: 'Acme SARL',
          identifiers: { commonCompanyId: '001234567000089' },
        },
        footer: { note: 'Document confidentiel — usage interne.' },
      },
      DATA,
    );

    expect(html).toContain('class="running-header"');
    expect(html).toContain('Acme SARL');
    expect(html).toContain('ICE: 001234567000089');
    expect(html).toContain('class="running-footer"');
    expect(html).toContain('Document confidentiel');
    expect(html).toContain('CMD-1');
  });

  it('rejects an unknown report type before any rendering is attempted', async () => {
    await expect(
      service.generateReport(
        { reportType: 'not-a-report', branding: { companyName: 'Acme SARL' } },
        DATA,
      ),
    ).rejects.toBeInstanceOf(UnknownReportTypeError);
  });
});
