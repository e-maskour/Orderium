import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfReportService } from './pdf-report.service';
import { PdfReportBuilder } from './core/pdf-report.builder';
import {
  REPORT_MAPPERS,
  ReportMapperRegistry,
} from './core/report-mapper.registry';
import { PlaywrightPdfApiClient } from './core/playwright-pdf.client';
import { PDF_API_CLIENT, ReportMapper } from './types';
import { SalesSummaryMapper } from './reports/sales-summary/sales-summary.mapper';
import { TabularReportMapper } from './reports/tabular/tabular-report.mapper';

/**
 * Every report type registered by this module.
 *
 * **Adding a report type = adding a mapper class here.** Nothing in `core/` or
 * `templates/` changes.
 */
const REPORT_MAPPER_CLASSES = [SalesSummaryMapper, TabularReportMapper];

/**
 * Binds the renderer behind the `PDF_API_CLIENT` seam.
 *
 * Reports render in-process with the Chromium this service already ships for
 * invoices, so there is no vendor credential, no per-document cost, and tenant
 * financial data never leaves the deployment.
 *
 * To move to a hosted vendor instead, construct an `HttpPdfApiClient` here —
 * pass `authProvider: () => resolvePdfApiAuth(config)`, a `PdfApiVendorAdapter`
 * (`GenericHtmlToPdfAdapter` covers most JSON APIs), and
 * `retry: resolvePdfApiRetryOptions(config)`, then set the `PDF_API_*`
 * variables. This provider is the only touch point.
 */
const pdfApiClientProvider: Provider = {
  provide: PDF_API_CLIENT,
  // A factory rather than `useClass`: the constructor takes a plain options
  // object, which Nest's DI cannot resolve as an injectable parameter.
  useFactory: () => new PlaywrightPdfApiClient(),
};

/** Collects the mapper instances into the array the registry consumes. */
const reportMappersProvider: Provider = {
  provide: REPORT_MAPPERS,
  inject: REPORT_MAPPER_CLASSES,
  useFactory: (...mappers: ReportMapper<any>[]) => mappers,
};

/**
 * Reusable PDF reporting module.
 *
 * Import it wherever reports are produced and inject {@link PdfReportService}.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    ...REPORT_MAPPER_CLASSES,
    reportMappersProvider,
    ReportMapperRegistry,
    pdfApiClientProvider,
    PdfReportBuilder,
    PdfReportService,
  ],
  exports: [PdfReportService, PdfReportBuilder, ReportMapperRegistry],
})
export class PdfReportModule {}
