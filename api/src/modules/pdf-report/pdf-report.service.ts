import { Injectable } from '@nestjs/common';
import { PdfReportBuilder } from './core/pdf-report.builder';
import { ReportMapperRegistry } from './core/report-mapper.registry';
import { createReportFormatter } from './core/report-formatter';
import { renderBaseLayout } from './templates/base-layout.template';
import { GeneratedReport, ReportConfig, ReportMapper } from './types';

/**
 * Public entry point of the pdf-report module.
 *
 * Inject this from any feature module (reports, invoices, statistics…) and call
 * {@link generateReport}. Everything else in this module is an implementation
 * detail behind it.
 */
@Injectable()
export class PdfReportService {
  constructor(
    private readonly builder: PdfReportBuilder,
    private readonly registry: ReportMapperRegistry,
  ) {}

  /**
   * Renders a report to PDF bytes.
   *
   * @example
   * ```ts
   * const report = await this.pdfReports.generateReport<SalesSummaryData>(
   *   {
   *     reportType: SALES_SUMMARY_REPORT_TYPE,
   *     branding: { companyName: 'Acme SARL', logo: { url: logoUrl } },
   *     footer: { note: 'Document confidentiel — usage interne.' },
   *     meta: [{ label: 'Période', value: 'Janvier 2026' }],
   *   },
   *   salesData,
   * );
   * res.set('Content-Type', report.contentType).send(report.buffer);
   * ```
   */
  generateReport<TData = unknown>(
    config: ReportConfig,
    data: TData,
  ): Promise<GeneratedReport> {
    return this.builder.generate<TData>(config, data);
  }

  /**
   * Composes the report HTML without calling the PDF API.
   *
   * Handy for in-browser previews and for eyeballing a new template locally
   * without spending API credits.
   *
   * The preview always uses the `css-paged` strategy so the running header and
   * footer appear *inside* the returned markup — under `native` numbering they
   * are separate templates the PDF service applies, and a browser would show a
   * headerless page.
   */
  renderHtml<TData = unknown>(config: ReportConfig, data: TData): string {
    const { document, config: resolved } = this.builder.buildDocument(
      { ...config, pageNumbering: 'css-paged' },
      data,
    );
    const formatter = createReportFormatter({
      locale: resolved.locale,
      currency: resolved.currency,
      timeZone: resolved.timeZone,
    });
    return renderBaseLayout(document, resolved, formatter).html;
  }

  /**
   * Registers a report type at runtime.
   *
   * Prefer contributing a provider under the `REPORT_MAPPERS` token; this is
   * the escape hatch for dynamically-loaded report types.
   */
  registerReport(mapper: ReportMapper<any>): void {
    this.registry.register(mapper);
  }

  /** Every report type currently renderable. */
  availableReports(): string[] {
    return this.registry.list();
  }
}
