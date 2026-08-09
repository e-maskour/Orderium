import { PageFormat } from './report-config.types';

/**
 * Vendor-neutral render request. The engine only ever produces this shape; a
 * vendor adapter maps it onto the concrete HTTP contract.
 */
export interface PdfRenderRequest {
  /** Complete, self-contained HTML document. */
  html: string;
  /**
   * Header template repeated on every page. Only used when the report's
   * page-numbering strategy is `native`; may contain the Chromium
   * `.pageNumber` / `.totalPages` placeholder spans.
   */
  headerHtml?: string;
  /** Footer template repeated on every page. See {@link headerHtml}. */
  footerHtml?: string;
  format: PageFormat;
  landscape: boolean;
  margins: { top: string; right: string; bottom: string; left: string };
  /** Print CSS backgrounds (zebra stripes, KPI cards). Effectively always true. */
  printBackground: boolean;
  /** File name hint some vendors echo back in `Content-Disposition`. */
  fileName?: string;
}

/**
 * The seam every consumer depends on. Swap the implementation to change PDF
 * vendors; nothing else in the module moves.
 */
export interface PdfApiClient {
  /** Renders HTML to PDF bytes, or throws a `PdfApiError` subclass. */
  render(request: PdfRenderRequest): Promise<Buffer>;
}

/** DI token for {@link PdfApiClient}. */
export const PDF_API_CLIENT = Symbol('PDF_API_CLIENT');

/** A concrete HTTP call, produced by a vendor adapter. */
export interface PdfApiHttpRequest {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  /** Already-serialised request body. */
  body: string;
}

/**
 * Maps the neutral request onto one vendor's HTTP contract and extracts the
 * PDF bytes from its response.
 *
 * Implementations live in `core/vendors/`. Keeping the endpoint shape here —
 * rather than hardcoded in the client — is what makes the vendor swappable.
 */
export interface PdfApiVendorAdapter {
  /** Human-readable vendor name, used in logs. */
  readonly name: string;
  /** Builds the HTTP call for a render request. */
  buildRequest(request: PdfRenderRequest, auth: PdfApiAuth): PdfApiHttpRequest;
  /**
   * Extracts PDF bytes from a successful response. Implementations that return
   * JSON containing a download URL should fetch it here.
   */
  parseResponse(response: Response): Promise<Buffer>;
}

/** Credentials resolved from the environment — never logged, never serialised. */
export interface PdfApiAuth {
  /** Value of `PDF_API_KEY`. */
  apiKey: string;
  /** Endpoint from `PDF_API_URL`. */
  endpoint: string;
  /** Header carrying the key. Defaults to `Authorization`. */
  headerName: string;
  /** Prefix for the header value, e.g. `Bearer`. May be empty. */
  headerScheme: string;
}

/** Retry/timeout policy for the HTTP client. */
export interface PdfApiRetryOptions {
  /** Total attempts including the first. Defaults to `3`. */
  maxAttempts: number;
  /** Per-attempt timeout in milliseconds. Defaults to `30000`. */
  timeoutMs: number;
  /** First backoff delay in milliseconds. Defaults to `500`. */
  baseDelayMs: number;
  /** Upper bound for a single backoff delay. Defaults to `8000`. */
  maxDelayMs: number;
  /** Random jitter ratio (0–1) applied to each delay. Defaults to `0.2`. */
  jitterRatio: number;
}

/** Defaults applied when the environment does not override them. */
export const DEFAULT_RETRY_OPTIONS: PdfApiRetryOptions = {
  maxAttempts: 3,
  timeoutMs: 30_000,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitterRatio: 0.2,
};
