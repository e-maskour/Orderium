import { Logger } from '@nestjs/common';
import { PlaywrightPdfApiClient } from '../core/playwright-pdf.client';
import {
  PdfApiInvalidResponseError,
  PdfApiNetworkError,
  PdfApiTimeoutError,
  PdfRenderRequest,
} from '../types';

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

type FakePage = {
  setContent: jest.Mock;
  evaluate: jest.Mock;
  pdf: jest.Mock;
  close: jest.Mock;
};

type FakeBrowser = {
  isConnected: jest.Mock;
  newPage: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
};

function fakePage(): FakePage {
  return {
    setContent: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(PDF_BYTES),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

function fakeBrowser(page: FakePage = fakePage()): FakeBrowser {
  return {
    isConnected: jest.fn().mockReturnValue(true),
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
}

/** Builds a client whose browser comes from the supplied factory. */
function clientWith(browsers: FakeBrowser[]): {
  client: PlaywrightPdfApiClient;
  launches: () => number;
} {
  let index = 0;
  const launch = jest.fn(() => {
    const next = browsers[Math.min(index, browsers.length - 1)];
    index += 1;
    return Promise.resolve(next as never);
  });

  return {
    client: new PlaywrightPdfApiClient({ browserFactory: launch }),
    launches: () => launch.mock.calls.length,
  };
}

describe('PlaywrightPdfApiClient', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('render', () => {
    it('maps the neutral request onto Chromium page.pdf options', async () => {
      const page = fakePage();
      const { client } = clientWith([fakeBrowser(page)]);

      await expect(client.render(RENDER_REQUEST)).resolves.toEqual(PDF_BYTES);

      expect(page.setContent).toHaveBeenCalledWith(
        RENDER_REQUEST.html,
        expect.objectContaining({ waitUntil: 'networkidle' }),
      );
      expect(page.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          landscape: false,
          printBackground: true,
          margin: RENDER_REQUEST.margins,
          displayHeaderFooter: true,
          headerTemplate: '<div>header</div>',
          footerTemplate: '<div>footer</div>',
        }),
      );
    });

    it('disables running templates when neither header nor footer is supplied', async () => {
      const page = fakePage();
      const { client } = clientWith([fakeBrowser(page)]);

      await client.render({
        ...RENDER_REQUEST,
        headerHtml: undefined,
        footerHtml: undefined,
      });

      expect(page.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ displayHeaderFooter: false }),
      );
    });

    it('sends an empty header template when only a footer is supplied, so Chromium omits its default date header', async () => {
      const page = fakePage();
      const { client } = clientWith([fakeBrowser(page)]);

      await client.render({ ...RENDER_REQUEST, headerHtml: undefined });

      expect(page.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHeaderFooter: true,
          headerTemplate: '',
          footerTemplate: '<div>footer</div>',
        }),
      );
    });

    it('waits for web fonts before rendering, so Arabic text is not clipped', async () => {
      const page = fakePage();
      const { client } = clientWith([fakeBrowser(page)]);

      await client.render(RENDER_REQUEST);

      expect(page.evaluate).toHaveBeenCalled();
      const evaluateOrder = page.evaluate.mock.invocationCallOrder[0];
      const pdfOrder = page.pdf.mock.invocationCallOrder[0];
      expect(evaluateOrder).toBeLessThan(pdfOrder);
    });

    it('closes the page even when rendering throws', async () => {
      const page = fakePage();
      page.pdf.mockRejectedValue(new Error('render exploded'));
      const { client } = clientWith([fakeBrowser(page)]);

      await expect(client.render(RENDER_REQUEST)).rejects.toThrow();
      expect(page.close).toHaveBeenCalled();
    });

    it('reuses a single browser across renders', async () => {
      const browser = fakeBrowser();
      const { client, launches } = clientWith([browser]);

      await client.render(RENDER_REQUEST);
      await client.render(RENDER_REQUEST);

      expect(launches()).toBe(1);
      expect(browser.newPage).toHaveBeenCalledTimes(2);
    });

    it('relaunches when the pooled browser has disconnected', async () => {
      const dead = fakeBrowser();
      dead.isConnected.mockReturnValue(false);
      const alive = fakeBrowser();
      const { client, launches } = clientWith([dead, alive]);

      await client.render(RENDER_REQUEST);
      await client.render(RENDER_REQUEST);

      expect(launches()).toBe(2);
      expect(alive.newPage).toHaveBeenCalled();
    });

    it('retries once when the browser dies between checkout and newPage', async () => {
      const stale = fakeBrowser();
      stale.newPage.mockRejectedValue(new Error('Target page closed'));
      const fresh = fakeBrowser();
      const { client } = clientWith([stale, fresh]);

      await expect(client.render(RENDER_REQUEST)).resolves.toEqual(PDF_BYTES);
      expect(fresh.newPage).toHaveBeenCalled();
    });
  });

  describe('error mapping', () => {
    it('maps a Playwright timeout onto PdfApiTimeoutError', async () => {
      const page = fakePage();
      page.setContent.mockRejectedValue(
        Object.assign(new Error('Timeout 30000ms exceeded'), {
          name: 'TimeoutError',
        }),
      );
      const { client } = clientWith([fakeBrowser(page)]);

      await expect(client.render(RENDER_REQUEST)).rejects.toBeInstanceOf(
        PdfApiTimeoutError,
      );
    });

    it('maps a browser launch failure onto PdfApiNetworkError', async () => {
      const client = new PlaywrightPdfApiClient({
        browserFactory: () =>
          Promise.reject(new Error('Executable does not exist')),
      });

      await expect(client.render(RENDER_REQUEST)).rejects.toBeInstanceOf(
        PdfApiNetworkError,
      );
    });

    it('rejects bytes that are not a PDF document', async () => {
      const page = fakePage();
      page.pdf.mockResolvedValue(Buffer.from('<html>error page</html>'));
      const { client } = clientWith([fakeBrowser(page)]);

      await expect(client.render(RENDER_REQUEST)).rejects.toBeInstanceOf(
        PdfApiInvalidResponseError,
      );
    });

    it('rejects an empty document', async () => {
      const page = fakePage();
      page.pdf.mockResolvedValue(Buffer.alloc(0));
      const { client } = clientWith([fakeBrowser(page)]);

      await expect(client.render(RENDER_REQUEST)).rejects.toBeInstanceOf(
        PdfApiInvalidResponseError,
      );
    });
  });

  describe('lifecycle', () => {
    it('closes the pooled browser on module destroy', async () => {
      const browser = fakeBrowser();
      const { client } = clientWith([browser]);

      await client.render(RENDER_REQUEST);
      await client.onModuleDestroy();

      expect(browser.close).toHaveBeenCalled();
    });

    it('is a no-op on destroy when no browser was ever launched', async () => {
      const browser = fakeBrowser();
      const { client, launches } = clientWith([browser]);

      await client.onModuleDestroy();

      expect(launches()).toBe(0);
      expect(browser.close).not.toHaveBeenCalled();
    });
  });
});
