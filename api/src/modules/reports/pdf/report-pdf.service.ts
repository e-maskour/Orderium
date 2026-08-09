import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationsService } from '../../configurations/configurations.service';
import {
  CompanyBranding,
  GeneratedReport,
  PdfReportService,
  ReportConfig,
  TABULAR_REPORT_TYPE,
  TabularReportPayload,
  TabularReportSpec,
  Tone,
} from '../../pdf-report';
import { GenerateReportPdfDto } from './dto/report-pdf.dto';
import { ReportPdfFilterDto } from './dto/report-pdf-filter.dto';
import { ReportPdfResolver } from './report-pdf.resolver';

/**
 * Upper bound on rows in a single PDF export.
 *
 * PDF is a read-once document, not a data dump — past a few thousand rows the
 * file stops being useful and the render call gets expensive. XLSX remains the
 * export path for full extracts.
 */
const MAX_PDF_ROWS = 2_000;

/** Company configuration entity holding tenant identity. */
const COMPANY_CONFIG_ENTITY = 'my_company';

/** Shape of the `my_company` configuration values. */
interface CompanyConfigValues {
  companyName?: string;
  logo?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  ice?: string;
  registrationNumber?: string;
  taxId?: string;
  vatNumber?: string;
}

/** Badge tones the client may request. Anything else falls back to neutral. */
const ALLOWED_TONES: Tone[] = [
  'neutral',
  'positive',
  'negative',
  'warning',
  'info',
];

/**
 * Turns an analytics report into a branded PDF.
 *
 * Re-runs the report without the screen's pagination so the document is the
 * complete result set, then renders it through the shared `pdf-report` engine.
 */
@Injectable()
export class ReportPdfService {
  private readonly logger = new Logger(ReportPdfService.name);

  constructor(
    private readonly resolver: ReportPdfResolver,
    private readonly pdfReports: PdfReportService,
    private readonly configurations: ConfigurationsService,
  ) {}

  /** Report keys available for PDF export. */
  availableReports(): string[] {
    return this.resolver.list();
  }

  async generate(
    reportKey: string,
    filter: ReportPdfFilterDto,
    spec: GenerateReportPdfDto,
  ): Promise<GeneratedReport> {
    // Export the full result set, not the page the user happens to be viewing.
    const exportFilter: ReportPdfFilterDto = {
      ...filter,
      page: 1,
      perPage: MAX_PDF_ROWS,
    };

    const data = await this.resolver.resolve(reportKey, exportFilter);
    const branding = await this.buildBranding();

    const config: ReportConfig = {
      reportType: TABULAR_REPORT_TYPE,
      title: spec.title,
      subtitle: spec.subtitle,
      branding,
      meta: spec.meta,
      footer: { note: spec.footerNote },
      locale: spec.locale,
      direction: spec.locale?.startsWith('ar') ? 'rtl' : 'ltr',
      fileName: spec.fileName || reportKey,
      page: spec.landscape ? { landscape: true } : undefined,
    };

    const payload: TabularReportPayload = {
      spec: this.toMapperSpec(spec),
      data,
      totalRowCount: data.meta?.total,
    };

    const report = await this.pdfReports.generateReport(config, payload);

    this.logger.log(
      `Report PDF "${reportKey}" generated — ${data.rows.length} row(s), ${report.byteLength} bytes`,
    );

    return report;
  }

  /** Maps the validated DTO onto the mapper's spec, sanitising badge tones. */
  private toMapperSpec(spec: GenerateReportPdfDto): TabularReportSpec {
    return {
      title: spec.title,
      subtitle: spec.subtitle,
      tableTitle: spec.tableTitle,
      emptyMessage: spec.emptyMessage,
      meta: spec.meta,
      kpis: spec.kpis,
      columns: spec.columns.map((column) => ({
        key: column.key,
        header: column.header,
        format: column.format,
        align: column.align,
        width: column.width,
        emphasis: column.emphasis,
        signed: column.signed,
        total: column.total,
        badgeMap: sanitiseBadgeMap(column.badgeMap),
      })),
    };
  }

  /**
   * Builds branding from the tenant's company configuration.
   *
   * Never throws: a tenant that has not filled in its company profile still
   * gets a usable report rather than a failed export.
   */
  private async buildBranding(): Promise<CompanyBranding> {
    const company = await this.loadCompanyConfig();

    return {
      companyName: company.companyName?.trim() || 'Morocom',
      logo: company.logo?.trim() ? { url: company.logo.trim() } : undefined,
      address: {
        line1: company.address?.trim(),
        zipCode: company.zipCode?.trim(),
        city: company.city?.trim(),
        country: company.country?.trim(),
      },
      contact: {
        phone: company.phone?.trim(),
        email: company.email?.trim(),
        website: company.website?.trim(),
      },
      identifiers: {
        commonCompanyId: company.ice?.trim(),
        taxId: company.taxId?.trim(),
        vatNumber: company.vatNumber?.trim(),
        registrationNumber: company.registrationNumber?.trim(),
      },
    };
  }

  private async loadCompanyConfig(): Promise<CompanyConfigValues> {
    try {
      const config = await this.configurations.findByEntity(
        COMPANY_CONFIG_ENTITY,
      );
      return (config?.values ?? {}) as CompanyConfigValues;
    } catch (error) {
      this.logger.warn(
        `Could not load company configuration for report branding: ${
          (error as Error)?.message
        }`,
      );
      return {};
    }
  }
}

/** Drops any tone the renderer does not know about. */
function sanitiseBadgeMap(
  badgeMap: Record<string, string> | undefined,
): Record<string, Tone> | undefined {
  if (!badgeMap) return undefined;

  const entries = Object.entries(badgeMap).filter(([, tone]) =>
    ALLOWED_TONES.includes(tone as Tone),
  ) as Array<[string, Tone]>;

  return entries.length ? Object.fromEntries(entries) : undefined;
}
