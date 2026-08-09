import { Logger } from '@nestjs/common';
import {
  DEFAULT_RETRY_OPTIONS,
  PdfApiAuth,
  PdfApiClient,
  PdfApiError,
  PdfApiHttpError,
  PdfApiNetworkError,
  PdfApiRetryExhaustedError,
  PdfApiRetryOptions,
  PdfApiTimeoutError,
  PdfApiVendorAdapter,
  PdfRenderRequest,
} from '../types';

/** Minimal `fetch` signature — injectable so tests never touch the network. */
export type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<Response>;

export interface HttpPdfApiClientOptions {
  /**
   * Resolves credentials at call time rather than at construction, so a missing
   * `PDF_API_KEY` fails the request instead of application bootstrap.
   */
  authProvider: () => PdfApiAuth;
  /** Vendor contract to speak. */
  adapter: PdfApiVendorAdapter;
  /** Retry/timeout policy. Partially overridable. */
  retry?: Partial<PdfApiRetryOptions>;
  /** Injected for tests. Defaults to global `fetch`. */
  fetchImpl?: FetchLike;
  /** Injected for tests. Defaults to a real `setTimeout` delay. */
  sleep?: (ms: number) => Promise<void>;
}

/** Body slice kept in error messages — enough to diagnose, small enough to log. */
const ERROR_BODY_LIMIT = 500;

/**
 * HTTP implementation of {@link PdfApiClient}: timeout per attempt, bounded
 * exponential backoff with jitter, `Retry-After` support, and typed errors.
 *
 * The API key is read from the environment by the `authProvider` and only ever
 * travels in a request header — it is never logged or embedded in an error.
 */
export class HttpPdfApiClient implements PdfApiClient {
  private readonly logger = new Logger(HttpPdfApiClient.name);

  private readonly authProvider: () => PdfApiAuth;
  private readonly adapter: PdfApiVendorAdapter;
  private readonly retry: PdfApiRetryOptions;
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: HttpPdfApiClientOptions) {
    this.authProvider = options.authProvider;
    this.adapter = options.adapter;
    this.retry = { ...DEFAULT_RETRY_OPTIONS, ...options.retry };
    this.fetchImpl =
      options.fetchImpl ?? ((input, init) => fetch(input, init as RequestInit));
    this.sleep =
      options.sleep ??
      ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  }

  async render(request: PdfRenderRequest): Promise<Buffer> {
    const auth = this.authProvider();
    const httpRequest = this.adapter.buildRequest(request, auth);

    let lastError: PdfApiError | undefined;

    for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt++) {
      try {
        return await this.attempt(httpRequest);
      } catch (error) {
        if (!(error instanceof PdfApiError)) throw error;
        lastError = error;

        const isLastAttempt = attempt === this.retry.maxAttempts;
        if (!error.retryable || isLastAttempt) break;

        const delay = this.backoffDelay(attempt, error);
        this.logger.warn(
          `PDF render attempt ${attempt}/${this.retry.maxAttempts} failed ` +
            `(${error.name}: ${error.message}) — retrying in ${delay}ms`,
        );
        await this.sleep(delay);
      }
    }

    // `lastError` is always set here: the loop only exits via `break` after a
    // caught error, or by returning a buffer.
    throw new PdfApiRetryExhaustedError(this.retry.maxAttempts, lastError!);
  }

  /** One HTTP round-trip, bounded by the configured timeout. */
  private async attempt(httpRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.retry.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(httpRequest.url, {
        method: httpRequest.method,
        headers: httpRequest.headers,
        body: httpRequest.body,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new PdfApiTimeoutError(this.retry.timeoutMs);
      }
      throw new PdfApiNetworkError(
        error instanceof Error ? error.message : String(error),
        error,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new PdfApiHttpError(
        response.status,
        await readBodySafely(response),
        parseRetryAfter(response.headers?.get?.('retry-after')),
      );
    }

    return this.adapter.parseResponse(response);
  }

  /**
   * Exponential backoff with jitter, capped at `maxDelayMs`. A `Retry-After`
   * hint from the server takes precedence (also capped, so a hostile or
   * mistaken header cannot stall the request pipeline).
   */
  private backoffDelay(attempt: number, error: PdfApiError): number {
    const hinted =
      error instanceof PdfApiHttpError && error.retryAfterSeconds !== undefined
        ? error.retryAfterSeconds * 1000
        : undefined;

    const exponential = this.retry.baseDelayMs * 2 ** (attempt - 1);
    const base = Math.min(hinted ?? exponential, this.retry.maxDelayMs);
    const jitter = base * this.retry.jitterRatio * Math.random();
    return Math.round(base + jitter);
  }
}

/** `fetch` surfaces timeouts as an `AbortError` on the thrown `DOMException`. */
function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}

/** Reads an error body without letting a broken stream mask the real failure. */
async function readBodySafely(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, ERROR_BODY_LIMIT);
  } catch {
    return '';
  }
}

/** Parses `Retry-After` in both its delay-seconds and HTTP-date forms. */
function parseRetryAfter(
  header: string | null | undefined,
): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;

  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) {
    const diff = (date.getTime() - Date.now()) / 1000;
    return diff > 0 ? diff : 0;
  }

  return undefined;
}
