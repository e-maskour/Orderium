/**
 * Typed errors for the pdf-report module.
 *
 * Callers can branch on `error instanceof PdfApiError` (transport concerns) vs
 * `PdfReportError` (composition concerns) without string matching.
 */

/** Base class for every error thrown by this module. */
export abstract class PdfReportModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** Raised while composing a report (unknown type, bad mapper output). */
export class PdfReportError extends PdfReportModuleError {
  constructor(
    message: string,
    readonly reportType?: string,
  ) {
    super(message);
  }
}

/** Raised when the requested `reportType` has no registered mapper. */
export class UnknownReportTypeError extends PdfReportError {
  constructor(
    reportType: string,
    readonly knownTypes: string[],
  ) {
    super(
      `No report mapper registered for type "${reportType}". ` +
        `Registered types: ${knownTypes.length ? knownTypes.join(', ') : '(none)'}.`,
      reportType,
    );
  }
}

/** Base class for PDF-rendering-API failures. */
export abstract class PdfApiError extends PdfReportModuleError {
  /** Whether retrying the same request could plausibly succeed. */
  abstract readonly retryable: boolean;
}

/** The API key or endpoint is missing/invalid in the environment. */
export class PdfApiConfigError extends PdfApiError {
  readonly retryable = false;
}

/** The request exceeded the configured timeout (per attempt). */
export class PdfApiTimeoutError extends PdfApiError {
  readonly retryable = true;

  constructor(readonly timeoutMs: number) {
    super(`PDF API request timed out after ${timeoutMs}ms`);
  }
}

/** DNS/socket/TLS failure — the request never got a response. */
export class PdfApiNetworkError extends PdfApiError {
  readonly retryable = true;

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(`PDF API network failure: ${message}`);
  }
}

/** The API answered with a non-2xx status. */
export class PdfApiHttpError extends PdfApiError {
  readonly retryable: boolean;

  constructor(
    readonly status: number,
    /** Truncated response body — useful for diagnostics, never contains the key. */
    readonly body: string,
    /** Seconds to wait before retrying, parsed from `Retry-After` when present. */
    readonly retryAfterSeconds?: number,
  ) {
    super(`PDF API responded ${status}: ${body || '(empty body)'}`);
    this.retryable = status === 408 || status === 429 || status >= 500;
  }
}

/** A 2xx response that did not contain usable PDF bytes. */
export class PdfApiInvalidResponseError extends PdfApiError {
  readonly retryable = false;
}

/** All retry attempts were exhausted; carries the final underlying failure. */
export class PdfApiRetryExhaustedError extends PdfApiError {
  readonly retryable = false;

  constructor(
    readonly attempts: number,
    readonly lastError: PdfApiError,
  ) {
    super(`PDF API failed after ${attempts} attempt(s): ${lastError.message}`);
  }
}
