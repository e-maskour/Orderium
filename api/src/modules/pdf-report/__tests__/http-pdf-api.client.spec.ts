import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchLike, HttpPdfApiClient } from '../core/http-pdf-api.client';
import { GenericHtmlToPdfAdapter } from '../core/vendors/generic-html-to-pdf.adapter';
import { resolvePdfApiAuth } from '../core/pdf-api.config';
import {
  PdfApiAuth,
  PdfApiConfigError,
  PdfApiHttpError,
  PdfApiInvalidResponseError,
  PdfApiNetworkError,
  PdfApiRetryExhaustedError,
  PdfApiTimeoutError,
  PdfRenderRequest,
} from '../types';

const API_KEY = 'test-secret-key';

const AUTH: PdfApiAuth = {
  apiKey: API_KEY,
  endpoint: 'https://pdf.example.test/render',
  headerName: 'Authorization',
  headerScheme: 'Bearer',
};

const PDF_BYTES = Buffer.from('%PDF-1.7\n…binary…\n%%EOF', 'latin1');

const RENDER_REQUEST: PdfRenderRequest = {
  html: '<html><body>report</body></html>',
  headerHtml: '<div>header</div>',
  footerHtml: '<div>footer</div>',
  format: 'A4',
  landscape: false,
  margins: { top: '34mm', right: '12mm', bottom: '20mm', left: '12mm' },
  printBackground: true,
  fileName: 'sales-summary.pdf',
};

/** Minimal stand-in for the parts of `Response` the client touches. */
function mockResponse(options: {
  ok?: boolean;
  status?: number;
  body?: Buffer | string;
  headers?: Record<string, string>;
}): Response {
  const { ok = true, status = 200, body = PDF_BYTES, headers = {} } = options;
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);

  return {
    ok,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    text: () => Promise.resolve(bytes.toString('utf8')),
    arrayBuffer: () =>
      Promise.resolve(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
      ),
  } as unknown as Response;
}

/** Builds a client with no real network, no real sleeping. */
function buildClient(
  fetchImpl: FetchLike,
  overrides: {
    authProvider?: () => PdfApiAuth;
    maxAttempts?: number;
    timeoutMs?: number;
  } = {},
) {
  const sleep = jest.fn().mockResolvedValue(undefined);
  const client = new HttpPdfApiClient({
    authProvider: overrides.authProvider ?? (() => AUTH),
    adapter: new GenericHtmlToPdfAdapter(),
    fetchImpl,
    sleep,
    retry: {
      maxAttempts: overrides.maxAttempts ?? 3,
      timeoutMs: overrides.timeoutMs ?? 50,
      baseDelayMs: 10,
      maxDelayMs: 40,
      jitterRatio: 0,
    },
  });
  return { client, sleep };
}

describe('HttpPdfApiClient', () => {
  beforeEach(() => {
    // The client logs retry warnings — keep the test output readable.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('happy path', () => {
    it('POSTs the composed HTML to the configured endpoint and returns the bytes', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(mockResponse({}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      const result = await client.render(RENDER_REQUEST);

      expect(result.subarray(0, 4).toString()).toBe('%PDF');
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      const [url, init] = fetchImpl.mock.calls[0] as [
        string,
        { method: string; headers: Record<string, string>; body: string },
      ];
      expect(url).toBe(AUTH.endpoint);
      expect(init.method).toBe('POST');

      const payload = JSON.parse(init.body) as Record<string, unknown>;
      expect(payload.html).toBe(RENDER_REQUEST.html);
      expect(payload.format).toBe('A4');
      expect(payload.margin).toEqual(RENDER_REQUEST.margins);
    });

    it('authenticates with the env-provided key and never puts it in the body', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(mockResponse({}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      await client.render(RENDER_REQUEST);

      const [, init] = fetchImpl.mock.calls[0] as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`);
      expect(init.body).not.toContain(API_KEY);
    });

    it('forwards the running header and footer as page templates', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(mockResponse({}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      await client.render(RENDER_REQUEST);

      const [, init] = fetchImpl.mock.calls[0] as [string, { body: string }];
      const payload = JSON.parse(init.body) as Record<string, unknown>;
      expect(payload.displayHeaderFooter).toBe(true);
      expect(payload.headerTemplate).toBe(RENDER_REQUEST.headerHtml);
      expect(payload.footerTemplate).toBe(RENDER_REQUEST.footerHtml);
    });

    it('sends the raw key when the auth scheme is empty', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(mockResponse({}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike, {
        authProvider: () => ({
          ...AUTH,
          headerName: 'X-API-Key',
          headerScheme: '',
        }),
      });

      await client.render(RENDER_REQUEST);

      const [, init] = fetchImpl.mock.calls[0] as [
        string,
        { headers: Record<string, string> },
      ];
      expect(init.headers['X-API-Key']).toBe(API_KEY);
    });
  });

  describe('retries', () => {
    it('retries a 500 and succeeds on a later attempt', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(
          mockResponse({ ok: false, status: 500, body: 'upstream boom' }),
        )
        .mockResolvedValueOnce(mockResponse({}));
      const { client, sleep } = buildClient(fetchImpl as unknown as FetchLike);

      const result = await client.render(RENDER_REQUEST);

      expect(result.length).toBeGreaterThan(0);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
    });

    it('retries network failures', async () => {
      const fetchImpl = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(mockResponse({}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      await expect(client.render(RENDER_REQUEST)).resolves.toBeInstanceOf(
        Buffer,
      );
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('gives up after maxAttempts and reports the last transport error', async () => {
      const fetchImpl = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('EAI_AGAIN'), {}));
      const { client } = buildClient(fetchImpl as unknown as FetchLike, {
        maxAttempts: 3,
      });

      const error = await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PdfApiRetryExhaustedError);
      const exhausted = error as PdfApiRetryExhaustedError;
      expect(exhausted.attempts).toBe(3);
      expect(exhausted.lastError).toBeInstanceOf(PdfApiNetworkError);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('does not retry a 400 — the request itself is the problem', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(
          mockResponse({ ok: false, status: 400, body: 'invalid html' }),
        );
      const { client, sleep } = buildClient(fetchImpl as unknown as FetchLike);

      const error = await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PdfApiRetryExhaustedError);
      const last = (error as PdfApiRetryExhaustedError)
        .lastError as PdfApiHttpError;
      expect(last).toBeInstanceOf(PdfApiHttpError);
      expect(last.status).toBe(400);
      expect(last.retryable).toBe(false);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('honours a Retry-After header on 429', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(
          mockResponse({
            ok: false,
            status: 429,
            body: 'slow down',
            headers: { 'retry-after': '2' },
          }),
        )
        .mockResolvedValueOnce(mockResponse({}));
      const { client, sleep } = buildClient(fetchImpl as unknown as FetchLike);

      await client.render(RENDER_REQUEST);

      // 2s hint, capped by maxDelayMs (40ms) so a hostile header cannot stall us.
      expect(sleep).toHaveBeenCalledWith(40);
    });

    it('keeps the API key out of HTTP error messages', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(
          mockResponse({ ok: false, status: 403, body: 'forbidden' }),
        );
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      const error = (await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e)) as Error;

      expect(error.message).toContain('403');
      expect(error.message).not.toContain(API_KEY);
    });
  });

  describe('timeouts', () => {
    it('aborts an attempt that exceeds the timeout', async () => {
      const fetchImpl: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        });
      const { client } = buildClient(fetchImpl, {
        maxAttempts: 1,
        timeoutMs: 20,
      });

      const error = await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e);

      const last = (error as PdfApiRetryExhaustedError).lastError;
      expect(last).toBeInstanceOf(PdfApiTimeoutError);
      expect((last as PdfApiTimeoutError).timeoutMs).toBe(20);
    });
  });

  describe('response validation', () => {
    it('rejects a 200 that is not a PDF and does not retry it', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(mockResponse({ body: '<html>oops</html>' }));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      const error = await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e);

      expect((error as PdfApiRetryExhaustedError).lastError).toBeInstanceOf(
        PdfApiInvalidResponseError,
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty 200 body', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(mockResponse({ body: Buffer.alloc(0) }));
      const { client } = buildClient(fetchImpl as unknown as FetchLike);

      const error = await client
        .render(RENDER_REQUEST)
        .catch((e: unknown) => e);

      expect((error as PdfApiRetryExhaustedError).lastError).toBeInstanceOf(
        PdfApiInvalidResponseError,
      );
    });

    it('decodes base64 responses when the vendor wraps the PDF in JSON', async () => {
      const adapter = new GenericHtmlToPdfAdapter({
        responseMode: 'base64',
        responsePath: 'result.file',
      });
      const response = mockResponse({
        body: JSON.stringify({
          result: { file: PDF_BYTES.toString('base64') },
        }),
      });

      await expect(adapter.parseResponse(response)).resolves.toEqual(PDF_BYTES);
    });
  });

  describe('credential resolution', () => {
    const configWith = (values: Record<string, string>) =>
      ({ get: (key: string) => values[key] }) as unknown as ConfigService;

    it('fails with a config error when PDF_API_KEY is missing', () => {
      const config = configWith({ PDF_API_URL: AUTH.endpoint });

      expect(() => resolvePdfApiAuth(config)).toThrow(PdfApiConfigError);
      expect(() => resolvePdfApiAuth(config)).toThrow(/PDF_API_KEY/);
    });

    it('fails with a config error when PDF_API_URL is missing', () => {
      const config = configWith({ PDF_API_KEY: API_KEY });

      expect(() => resolvePdfApiAuth(config)).toThrow(/PDF_API_URL/);
    });

    it('defaults the auth header to a bearer Authorization header', () => {
      const auth = resolvePdfApiAuth(
        configWith({ PDF_API_KEY: API_KEY, PDF_API_URL: AUTH.endpoint }),
      );

      expect(auth).toEqual(AUTH);
    });

    it('surfaces the config error through render() rather than at bootstrap', async () => {
      const fetchImpl = jest.fn();
      const config = configWith({});
      const { client } = buildClient(fetchImpl as unknown as FetchLike, {
        authProvider: () => resolvePdfApiAuth(config),
      });

      await expect(client.render(RENDER_REQUEST)).rejects.toBeInstanceOf(
        PdfApiConfigError,
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });
});
