import {
  PdfApiAuth,
  PdfApiHttpRequest,
  PdfApiInvalidResponseError,
  PdfApiVendorAdapter,
  PdfRenderRequest,
} from '../../types';

/**
 * Shape of the JSON body sent by the generic adapter. Field names are the ones
 * shared by mainstream HTML-to-PDF services; anything vendor-specific belongs
 * in a dedicated adapter rather than here.
 */
export interface GenericPdfApiPayload {
  html: string;
  format: string;
  landscape: boolean;
  printBackground: boolean;
  margin: { top: string; right: string; bottom: string; left: string };
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  fileName?: string;
}

/** How the vendor returns the finished document. */
export type GenericResponseMode = 'binary' | 'base64' | 'url';

export interface GenericAdapterOptions {
  /**
   * `binary` — the response body *is* the PDF (default).
   * `base64` — JSON containing base64 bytes at {@link responsePath}.
   * `url` — JSON containing a download URL at {@link responsePath}; the adapter
   *   performs a second GET to fetch the bytes.
   */
  responseMode?: GenericResponseMode;
  /** Dot-path to the payload inside a JSON response, e.g. `'data.file'`. */
  responsePath?: string;
  /** Extra static headers (vendor-specific opt-ins). */
  extraHeaders?: Record<string, string>;
}

/** Reads a dot-separated path out of a parsed JSON object. */
function readPath(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, segment) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      source,
    );
}

/**
 * A deliberately generic HTML-to-PDF adapter.
 *
 * The endpoint, auth header, and response handling all come from configuration
 * rather than being hardcoded to one vendor, so pointing the module at
 * api2pdf / PDFShift / Browserless / a self-hosted renderer is a config change.
 * When a vendor's contract diverges (nested option objects, multipart uploads),
 * write a sibling adapter implementing {@link PdfApiVendorAdapter} and provide
 * it instead — no other file changes.
 */
export class GenericHtmlToPdfAdapter implements PdfApiVendorAdapter {
  readonly name = 'generic-html-to-pdf';

  private readonly responseMode: GenericResponseMode;
  private readonly responsePath: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: GenericAdapterOptions = {}) {
    this.responseMode = options.responseMode ?? 'binary';
    this.responsePath = options.responsePath ?? 'data';
    this.extraHeaders = options.extraHeaders ?? {};
  }

  buildRequest(request: PdfRenderRequest, auth: PdfApiAuth): PdfApiHttpRequest {
    const hasRunningTemplates = Boolean(
      request.headerHtml || request.footerHtml,
    );

    const payload: GenericPdfApiPayload = {
      html: request.html,
      format: request.format,
      landscape: request.landscape,
      printBackground: request.printBackground,
      margin: request.margins,
      displayHeaderFooter: hasRunningTemplates,
      headerTemplate: request.headerHtml,
      footerTemplate: request.footerHtml,
      fileName: request.fileName,
    };

    const authValue = auth.headerScheme
      ? `${auth.headerScheme} ${auth.apiKey}`
      : auth.apiKey;

    return {
      url: auth.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:
          this.responseMode === 'binary'
            ? 'application/pdf'
            : 'application/json',
        [auth.headerName]: authValue,
        ...this.extraHeaders,
      },
      body: JSON.stringify(payload),
    };
  }

  async parseResponse(response: Response): Promise<Buffer> {
    if (this.responseMode === 'binary') {
      const bytes = Buffer.from(await response.arrayBuffer());
      this.assertPdf(bytes);
      return bytes;
    }

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new PdfApiInvalidResponseError(
        `Expected JSON from the PDF API but received: ${text.slice(0, 200)}`,
      );
    }

    const value = readPath(parsed, this.responsePath);
    if (typeof value !== 'string' || !value) {
      throw new PdfApiInvalidResponseError(
        `PDF API response has no usable value at path "${this.responsePath}"`,
      );
    }

    if (this.responseMode === 'base64') {
      const bytes = Buffer.from(value, 'base64');
      this.assertPdf(bytes);
      return bytes;
    }

    // responseMode === 'url' — follow the download link.
    const download = await fetch(value);
    if (!download.ok) {
      throw new PdfApiInvalidResponseError(
        `Failed to download the generated PDF (${download.status})`,
      );
    }
    const bytes = Buffer.from(await download.arrayBuffer());
    this.assertPdf(bytes);
    return bytes;
  }

  /** Guards against a 200 that carries an error page instead of a document. */
  private assertPdf(bytes: Buffer): void {
    if (bytes.length === 0) {
      throw new PdfApiInvalidResponseError(
        'PDF API returned an empty document',
      );
    }
    if (bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new PdfApiInvalidResponseError(
        'PDF API response is not a PDF document (missing %PDF header)',
      );
    }
  }
}
