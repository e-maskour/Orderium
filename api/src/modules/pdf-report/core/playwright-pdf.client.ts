import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, chromium } from 'playwright';
import {
  PdfApiClient,
  PdfApiError,
  PdfApiInvalidResponseError,
  PdfApiNetworkError,
  PdfApiTimeoutError,
  PdfRenderRequest,
} from '../types';

/** Launches a Chromium instance. Injected so tests never start a real browser. */
export type BrowserFactory = () => Promise<Browser>;

export interface PlaywrightPdfApiClientOptions {
  /** Defaults to a hardened headless Chromium launch. */
  browserFactory?: BrowserFactory;
  /** Ceiling for `setContent` — covers slow web fonts and inlined images. */
  contentTimeoutMs?: number;
}

const DEFAULT_CONTENT_TIMEOUT_MS = 30_000;

/**
 * Container-safe launch flags, matching the ones the invoice renderer in
 * `modules/pdf` already runs with.
 */
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
];

/** Playwright surfaces navigation/timeout failures under this error name. */
function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'TimeoutError'
  );
}

/** A browser that went away between checkout and use is worth one retry. */
function isDisconnectError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    message.includes('closed') ||
    message.includes('disconnected') ||
    message.includes('Target closed')
  );
}

/**
 * Renders reports with the Chromium already bundled in this service, rather
 * than posting HTML to a third-party API.
 *
 * The neutral {@link PdfRenderRequest} is Chromium's own `page.pdf()` option
 * set, so the mapping below is one-to-one — the `.pageNumber` / `.totalPages`
 * spans in the running templates are substituted by Chromium itself.
 *
 * Keeping rendering in-process means report HTML — which carries tenant
 * financial data — never leaves the deployment, and there is no per-document
 * cost or vendor credential to manage.
 *
 * To move to a hosted vendor instead, bind {@link HttpPdfApiClient} to the
 * `PDF_API_CLIENT` token in `pdf-report.module.ts` and set the `PDF_API_*`
 * environment variables. Nothing else in the module changes.
 */
@Injectable()
export class PlaywrightPdfApiClient implements PdfApiClient, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightPdfApiClient.name);

  private readonly browserFactory: BrowserFactory;
  private readonly contentTimeoutMs: number;

  /** Singleton browser — launching one costs ~300ms and ~150MB. */
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;
  /** Set during shutdown so the disconnect handler stays quiet. */
  private closing = false;

  constructor(options: PlaywrightPdfApiClientOptions = {}) {
    this.browserFactory =
      options.browserFactory ??
      (() => chromium.launch({ headless: true, args: LAUNCH_ARGS }));
    this.contentTimeoutMs =
      options.contentTimeoutMs ?? DEFAULT_CONTENT_TIMEOUT_MS;
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  async render(request: PdfRenderRequest): Promise<Buffer> {
    const page = await this.newPage();

    try {
      await page.setContent(request.html, {
        waitUntil: 'networkidle',
        timeout: this.contentTimeoutMs,
      });

      // Block on web fonts: Noto Sans Arabic loads late and an unresolved
      // face renders as clipped boxes in the finished document. The await
      // happens in-page so nothing non-serialisable crosses the bridge.
      await page.evaluate(async () => {
        await (document as unknown as { fonts: { ready: Promise<unknown> } })
          .fonts.ready;
      });

      const hasRunningTemplates = Boolean(
        request.headerHtml || request.footerHtml,
      );

      const bytes = await page.pdf({
        format: request.format,
        landscape: request.landscape,
        printBackground: request.printBackground,
        margin: request.margins,
        displayHeaderFooter: hasRunningTemplates,
        // Chromium injects its own date header when the template is absent but
        // header/footer display is on, so pass an explicit empty string.
        headerTemplate: request.headerHtml ?? '',
        footerTemplate: request.footerHtml ?? '',
      });

      this.assertPdf(bytes);
      return bytes;
    } catch (error) {
      throw this.toPdfApiError(error);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /**
   * Opens a page, retrying once against a fresh browser when the pooled
   * instance died between the connectivity check and `newPage`.
   */
  private async newPage(): ReturnType<Browser['newPage']> {
    try {
      const browser = await this.getBrowser();
      return await browser.newPage();
    } catch (error) {
      if (!isDisconnectError(error)) throw this.toPdfApiError(error);

      this.logger.warn('Browser closed before newPage — forcing re-launch');
      this.browser = null;
      this.launchPromise = null;

      try {
        const fresh = await this.getBrowser();
        return await fresh.newPage();
      } catch (retryError) {
        throw this.toPdfApiError(retryError);
      }
    }
  }

  /** Returns the shared browser, launching it on first use. */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;

    // Collapse concurrent report requests onto a single launch.
    if (!this.launchPromise) {
      this.launchPromise = this.browserFactory()
        .then((browser) => {
          this.browser = browser;
          this.launchPromise = null;
          this.logger.log('Chromium browser launched (pdf-report singleton)');
          browser.on('disconnected', () => {
            this.browser = null;
            if (this.closing) return;
            this.logger.warn(
              'Chromium browser disconnected — will re-launch on next report',
            );
          });
          return browser;
        })
        .catch((error) => {
          this.launchPromise = null;
          throw error;
        });
    }

    return this.launchPromise;
  }

  private async closeBrowser(): Promise<void> {
    this.closing = true;
    try {
      if (this.browser?.isConnected()) {
        await this.browser.close();
        this.logger.log('Chromium browser closed (pdf-report singleton)');
      }
      this.browser = null;
      this.launchPromise = null;
    } finally {
      this.closing = false;
    }
  }

  /** Guards against Chromium handing back something that is not a document. */
  private assertPdf(bytes: Buffer): void {
    if (bytes.length === 0) {
      throw new PdfApiInvalidResponseError(
        'Chromium returned an empty document',
      );
    }
    if (bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new PdfApiInvalidResponseError(
        'Rendered output is not a PDF document (missing %PDF header)',
      );
    }
  }

  /** Normalises Playwright failures onto the module's transport error contract. */
  private toPdfApiError(error: unknown): PdfApiError {
    if (error instanceof PdfApiError) return error;

    if (isTimeoutError(error)) {
      return new PdfApiTimeoutError(this.contentTimeoutMs);
    }

    return new PdfApiNetworkError(
      error instanceof Error ? error.message : String(error),
      error,
    );
  }
}
