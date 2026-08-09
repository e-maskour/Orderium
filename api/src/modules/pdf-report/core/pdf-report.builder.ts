import { Inject, Injectable, Logger } from '@nestjs/common';
// `PdfApiClient` is only a type; `isolatedModules` + `emitDecoratorMetadata`
// require type-only imports for anything in a decorated signature.
import type { PdfApiClient } from '../types';
import {
  GeneratedReport,
  PDF_API_CLIENT,
  PdfReportError,
  ReportConfig,
  ReportDocument,
  ReportMapper,
  ReportMapperContext,
  PdfRenderRequest,
  ResolvedReportConfig,
} from '../types';
import { ReportMapperRegistry } from './report-mapper.registry';
import { createReportFormatter } from './report-formatter';
import { resolveReportConfig } from './resolve-report-config';
import { renderBaseLayout } from '../templates/base-layout.template';

/**
 * The single rendering engine every report type goes through.
 *
 * Pipeline: **resolve config → map data → compose HTML → call the PDF API**.
 * Steps 1, 3 and 4 are fixed; only step 2 varies per report, and it is supplied
 * by a registered {@link ReportMapper}. That is the whole extensibility story —
 * a new report type never touches this file.
 */
@Injectable()
export class PdfReportBuilder {
  private readonly logger = new Logger(PdfReportBuilder.name);

  constructor(
    private readonly registry: ReportMapperRegistry,
    @Inject(PDF_API_CLIENT) private readonly apiClient: PdfApiClient,
  ) {}

  /**
   * Generates a report end to end.
   *
   * @param config - report type, branding, page setup and locale.
   * @param data   - payload for the mapper registered under `config.reportType`.
   * @throws {@link UnknownReportTypeError} when no mapper is registered.
   * @throws {@link PdfApiError} subclasses when the rendering API fails.
   */
  async generate<TData = unknown>(
    config: ReportConfig,
    data: TData,
  ): Promise<GeneratedReport> {
    const startedAt = Date.now();
    const mapper = this.registry.get<TData>(config.reportType);

    const resolved = resolveReportConfig(config, mapper);
    const document = this.runMapper(mapper, data, resolved);
    const finalConfig = this.applyDocumentOverrides(resolved, config, document);

    const request = this.compose(document, finalConfig);
    const buffer = await this.apiClient.render(request);

    this.logger.log(
      `Report "${config.reportType}" rendered — ${document.blocks.length} block(s), ` +
        `${buffer.length} bytes, ${Date.now() - startedAt}ms`,
    );

    return {
      buffer,
      fileName: `${finalConfig.fileName}.pdf`,
      contentType: 'application/pdf',
      byteLength: buffer.length,
    };
  }

  /**
   * Composes the render request without calling the API.
   *
   * Useful for HTML previews and for snapshot-testing a mapper's output.
   */
  compose(
    document: ReportDocument,
    config: ResolvedReportConfig,
  ): PdfRenderRequest {
    const formatter = createReportFormatter({
      locale: config.locale,
      currency: config.currency,
      timeZone: config.timeZone,
    });

    const composed = renderBaseLayout(document, config, formatter);

    return {
      html: composed.html,
      headerHtml: composed.headerHtml,
      footerHtml: composed.footerHtml,
      format: config.page.format,
      landscape: config.page.landscape,
      margins: config.page.margins,
      printBackground: true,
      fileName: `${config.fileName}.pdf`,
    };
  }

  /** Resolves config and maps data, returning both — for HTML-only previews. */
  buildDocument<TData>(
    config: ReportConfig,
    data: TData,
  ): { document: ReportDocument; config: ResolvedReportConfig } {
    const mapper = this.registry.get<TData>(config.reportType);
    const resolved = resolveReportConfig(config, mapper);
    const document = this.runMapper(mapper, data, resolved);
    return {
      document,
      config: this.applyDocumentOverrides(resolved, config, document),
    };
  }

  /** Invokes the mapper and validates its output shape. */
  private runMapper<TData>(
    mapper: ReportMapper<TData>,
    data: TData,
    config: ResolvedReportConfig,
  ): ReportDocument {
    const context: ReportMapperContext = {
      config,
      format: createReportFormatter({
        locale: config.locale,
        currency: config.currency,
        timeZone: config.timeZone,
      }),
    };

    const document = mapper.map(data, context);

    if (!document || !Array.isArray(document.blocks)) {
      throw new PdfReportError(
        `Mapper for "${mapper.reportType}" returned an invalid document (expected { blocks: [] })`,
        mapper.reportType,
      );
    }

    return document;
  }

  /**
   * A mapper may name the report; an explicit `config.title`/`subtitle` from
   * the caller always wins over it.
   */
  private applyDocumentOverrides(
    resolved: ResolvedReportConfig,
    original: ReportConfig,
    document: ReportDocument,
  ): ResolvedReportConfig {
    const callerSetTitle = Boolean(original.title?.trim());
    const callerSetSubtitle = Boolean(original.subtitle?.trim());

    if (callerSetTitle && callerSetSubtitle) return resolved;

    return {
      ...resolved,
      title:
        !callerSetTitle && document.title?.trim()
          ? document.title.trim()
          : resolved.title,
      subtitle:
        !callerSetSubtitle && document.subtitle?.trim()
          ? document.subtitle.trim()
          : resolved.subtitle,
    };
  }
}
