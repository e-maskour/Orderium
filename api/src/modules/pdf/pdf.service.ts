import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { In, Repository } from 'typeorm';
import { chromium, Browser } from 'playwright';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote } from '../quotes/entities/quote.entity';
import {
  renderDocumentTemplate,
  renderHeaderTemplate,
  renderFooterTemplate,
} from './templates/document.template';
import {
  renderReceiptTemplate,
  RECEIPT_WIDTH_MM,
} from './templates/receipt.template';
import {
  renderDeliveryNoteTemplate,
  renderDeliveryNotePageFooter,
  DELIVERY_NOTE_MARGINS,
} from './templates/delivery-note.template';
import {
  OrderPrintData,
  amountToFrenchWords,
  getPaymentStatusView,
  renderCode128Svg,
  resolvePaymentState,
} from './templates/order-print.shared';
import { renderOrdersMergeTemplate } from './templates/orders-merge.template';
import type { OrdersMergeView } from './templates/orders-merge.template';
import { getDocumentStyles } from './templates/document.styles';
import { ConfigurationsService } from '../configurations/configurations.service';
import { Order } from '../orders/entities/order.entity';
import { MinioProvider } from '../images/providers/minio.provider';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { extractPartnerInfo, mapDocumentItems } from './pdf.helpers';
import { buildOrdersMergeSummary } from '../orders/orders.helpers';
import {
  formatAmount,
  formatDate,
  formatQuantity,
} from '../../common/utils/french-format';
import type { MergeSummaryResult } from '../orders/orders.helpers';

type DocumentType = 'invoice' | 'quote' | 'delivery-note' | 'receipt';

interface PDFGenerationResult {
  pdfBuffer: Buffer;
  fileName: string;
}

interface DocumentData {
  id: number;
  documentNumber: string;
  date: Date;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerIce?: string;
  subtotal: number;
  discount?: number;
  discountType?: number;
  tax: number;
  total: number;
  notes?: string;
  items: DocumentItemData[];
  invoiceNumber?: string;
  dueDate?: Date;
  status?: string;
  quoteNumber?: string;
  expirationDate?: Date;
  signedBy?: string;
  signedDate?: Date;
  orderNumber?: string;
  originType?: string;
  isDemandePrix?: boolean; // For purchase quotes (achat)
  supplierName?: string;
  paidAmount?: number;
}

interface DocumentItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface CompanyConfigData {
  companyName?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  ice?: string;
  registrationNumber?: string;
  taxId?: string;
  vatNumber?: string;
  logo?: string;
}

@Injectable()
export class PDFService implements OnModuleDestroy {
  private readonly logger = new Logger(PDFService.name);

  /** Singleton browser instance — launched lazily, reused across all PDF jobs */
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;

  /** PDF buffer TTL in Redis: 5 minutes */
  private static readonly PDF_CACHE_TTL_MS = 5 * 60 * 1000;
  /** Bump whenever a PDF template/layout changes so stale cached PDFs are bypassed. */
  private static readonly PDF_CACHE_VERSION = 'v5';

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    private readonly minioProvider: MinioProvider,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  /** Returns a shared Chromium browser, launching it on first call */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;

    // Prevent concurrent launches
    if (!this.browserLaunchPromise) {
      this.browserLaunchPromise = chromium
        .launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
          ],
        })
        .then((b) => {
          this.browser = b;
          this.browserLaunchPromise = null;
          this.logger.log('Chromium browser launched (singleton)');
          b.on('disconnected', () => {
            this.browser = null;
            this.logger.warn(
              'Chromium browser disconnected — will re-launch on next job',
            );
          });
          return b;
        })
        .catch((err) => {
          this.browserLaunchPromise = null;
          throw err;
        });
    }

    return this.browserLaunchPromise;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.logger.log('Chromium browser closed');
    }
    this.browser = null;
    this.browserLaunchPromise = null;
  }

  /**
   * Creates a new page, retrying once with a fresh browser if the current
   * instance has been disconnected between getBrowser() and newPage().
   */
  private async getNewPage(
    options: Parameters<Browser['newPage']>[0],
  ): ReturnType<Browser['newPage']> {
    try {
      const browser = await this.getBrowser();
      return await browser.newPage(options);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (
        msg.includes('closed') ||
        msg.includes('disconnected') ||
        msg.includes('Target closed')
      ) {
        this.logger.warn('Browser closed before newPage — forcing re-launch');
        // Discard the stale reference so getBrowser re-launches
        this.browser = null;
        this.browserLaunchPromise = null;
        const freshBrowser = await this.getBrowser();
        return freshBrowser.newPage(options);
      }
      throw err;
    }
  }

  private get invoiceRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get quoteRepository(): Repository<Quote> {
    return this.tenantConnService.getRepository(Quote);
  }

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  async generateDocumentPDF(
    documentType: DocumentType,
    documentId: number,
    lang: 'fr' | 'ar' = 'fr',
  ): Promise<PDFGenerationResult> {
    const tenantSlug = this.tenantConnService.getCurrentTenantSlug();
    const cacheKey = `pdf:${PDFService.PDF_CACHE_VERSION}:${tenantSlug}:${documentType}:${documentId}:${lang}`;

    // Serve from Redis cache if available (skips Playwright entirely)
    const cached = await this.cacheManager.get<{
      pdfBase64: string;
      fileName: string;
    }>(cacheKey);
    if (cached) {
      this.logger.debug(`PDF cache HIT: ${cacheKey}`);
      return {
        pdfBuffer: Buffer.from(cached.pdfBase64, 'base64'),
        fileName: cached.fileName,
      };
    }

    const documentData = await this.fetchDocumentData(documentType, documentId);

    let pdfBuffer: Buffer;
    let fileName: string;
    if (documentType === 'receipt') {
      pdfBuffer = await this.generateReceiptPDF(documentData, lang);
      fileName = `Recu_${documentData.documentNumber}.pdf`;
    } else if (
      documentType === 'delivery-note' &&
      !documentData.isDemandePrix
    ) {
      pdfBuffer = await this.generateDeliveryNotePDF(documentData, lang);
      fileName = this.getFileName(documentType, documentData);
    } else {
      pdfBuffer = await this.generateA5PDF(documentType, documentData, lang);
      fileName = this.getFileName(documentType, documentData);
    }

    // Store in Redis cache (fire-and-forget — never block the response)
    this.cacheManager
      .set(
        cacheKey,
        { pdfBase64: pdfBuffer.toString('base64'), fileName },
        PDFService.PDF_CACHE_TTL_MS,
      )
      .catch((err) =>
        this.logger.warn(`PDF cache SET failed: ${(err as Error).message}`),
      );

    return { pdfBuffer, fileName };
  }

  /**
   * Consolidated A4 recap of several orders. `view` picks which of the two
   * merge-modal tabs is printed: `detailed` renders each order header followed
   * by all of its items, `consolidated` renders the picking list (one line per
   * product, quantities summed). Read-only — nothing is persisted.
   */
  async generateOrdersMergePDF(
    orderIds: number[],
    lang: 'fr' | 'ar' = 'fr',
    view: OrdersMergeView = 'detailed',
  ): Promise<PDFGenerationResult> {
    const uniqueIds = [...new Set(orderIds)];
    const tenantSlug = this.tenantConnService.getCurrentTenantSlug();
    const cacheKey = `pdf:${PDFService.PDF_CACHE_VERSION}:${tenantSlug}:orders-merge:${[
      ...uniqueIds,
    ]
      .sort((a, b) => a - b)
      .join('-')}:${lang}:${view}`;

    const cached = await this.cacheManager.get<{
      pdfBase64: string;
      fileName: string;
    }>(cacheKey);
    if (cached) {
      this.logger.debug(`PDF cache HIT: ${cacheKey}`);
      return {
        pdfBuffer: Buffer.from(cached.pdfBase64, 'base64'),
        fileName: cached.fileName,
      };
    }

    const orders = await this.orderRepository.find({
      where: { id: In(uniqueIds) },
      relations: ['customer', 'supplier', 'items', 'items.product'],
    });

    if (orders.length === 0) {
      throw new NotFoundException('None of the selected orders were found');
    }

    const summary = buildOrdersMergeSummary(orders, uniqueIds);
    const pdfBuffer = await this.renderOrdersMergePDF(summary, lang, view);
    const fileName = `Recapitulatif_Commandes_${summary.orderCount}.pdf`;

    this.cacheManager
      .set(
        cacheKey,
        { pdfBase64: pdfBuffer.toString('base64'), fileName },
        PDFService.PDF_CACHE_TTL_MS,
      )
      .catch((err) =>
        this.logger.warn(`PDF cache SET failed: ${(err as Error).message}`),
      );

    return { pdfBuffer, fileName };
  }

  private async renderOrdersMergePDF(
    summary: MergeSummaryResult,
    lang: 'fr' | 'ar',
    view: OrdersMergeView,
  ): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 2,
    });

    try {
      await page.setContent(
        renderOrdersMergeTemplate({ ...summary, lang, view }),
        {
          waitUntil: 'networkidle',
          timeout: 30000,
        },
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      await page.evaluate(() => (document as any).fonts.ready);

      const companyConfig = await this.getCompanyConfig();

      const headerTemplate = renderHeaderTemplate({
        companyName: companyConfig.companyName || '',
        companyLines: this.buildCompanyLines(companyConfig, lang),
        logoSrc: await this.resolveLogoSrc(companyConfig.logo),
        documentLabel:
          lang === 'ar' ? 'ملخص الطلبات' : 'RÉCAPITULATIF DE COMMANDES',
        documentNumber: String(summary.orderCount),
        date: formatDate(new Date()),
        lang,
      });

      const footerTemplate = renderFooterTemplate({
        footerLines: this.buildCompanyFooterLines(companyConfig),
        lang,
      });

      return await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '32mm',
          bottom: '14mm',
          left: '8mm',
          right: '8mm',
        },
      });
    } finally {
      await page.close();
    }
  }

  /**
   * Evict cached PDF for a specific document.
   * Call this when a document is updated so the next preview re-generates.
   */
  async invalidatePDFCache(
    documentType: DocumentType,
    documentId: number,
  ): Promise<void> {
    try {
      const tenantSlug = this.tenantConnService.getCurrentTenantSlug();
      for (const lang of ['fr', 'ar'] as const) {
        await this.cacheManager.del(
          `pdf:${PDFService.PDF_CACHE_VERSION}:${tenantSlug}:${documentType}:${documentId}:${lang}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `PDF cache invalidation failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Delete a previously-stored PDF from MinIO using its full public URL.
   * Silently ignores missing objects. Never throws.
   */
  async deletePDF(pdfUrl: string | null | undefined): Promise<void> {
    if (!pdfUrl) return;
    try {
      // Extract the object key from the full URL: everything after /<bucket>/
      const match = pdfUrl.match(/\/([^/]+\/[^/]+\.pdf)$/i);
      if (!match) {
        this.logger.warn(`Cannot parse object key from PDF URL: ${pdfUrl}`);
        return;
      }
      const objectKey = match[1];
      await this.minioProvider.delete(objectKey);
      this.logger.log(`🗑️  PDF deleted from MinIO: ${objectKey}`);
    } catch (error) {
      // Non-fatal — just log and continue
      this.logger.warn(
        `Could not delete PDF from MinIO (${pdfUrl}): ${(error as Error)?.message}`,
      );
    }
  }

  /**
   * Generate a PDF for the given document and upload it to MinIO.
   * Returns the public URL of the stored PDF, or null if upload failed.
   * Never throws — errors are logged and the validation continues regardless.
   */
  async generateAndUploadPDF(
    documentType: DocumentType,
    documentId: number,
  ): Promise<string | null> {
    try {
      const { pdfBuffer, fileName } = await this.generateDocumentPDF(
        documentType,
        documentId,
      );
      const url = await this.minioProvider.uploadBuffer(
        pdfBuffer,
        'pdfs',
        fileName,
        'application/pdf',
      );
      this.logger.log(`📄 PDF uploaded to MinIO: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate/upload PDF for ${documentType} #${documentId}`,
        (error as Error)?.stack,
      );
      return null;
    }
  }

  /**
   * Delete the existing stored PDF (if any), regenerate it, upload to MinIO,
   * and persist the new URL on the entity. Returns the new URL.
   * Throws on failure (unlike generateAndUploadPDF which swallows errors).
   */
  async regeneratePDF(
    documentType: DocumentType,
    documentId: number,
  ): Promise<string> {
    // Bust Redis cache so the next preview re-generates fresh
    await this.invalidatePDFCache(documentType, documentId);

    // Fetch current entity to get the old pdfUrl
    const entityRepo = this.getEntityRepository(documentType);
    if (!entityRepo) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    const entity = await entityRepo.findOne({ where: { id: documentId } });
    if (!entity) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }

    // Delete old PDF from MinIO (best-effort)
    await this.deletePDF((entity as { pdfUrl?: string | null }).pdfUrl);

    // Generate and upload new PDF
    const { pdfBuffer, fileName } = await this.generateDocumentPDF(
      documentType,
      documentId,
    );
    const newUrl = await this.minioProvider.uploadBuffer(
      pdfBuffer,
      'pdfs',
      fileName,
      'application/pdf',
    );

    // Persist new URL
    await entityRepo.update(documentId, { pdfUrl: newUrl } as Record<
      string,
      unknown
    >);

    this.logger.log(
      `🔄 PDF regenerated for ${documentType} #${documentId}: ${newUrl}`,
    );
    return newUrl;
  }

  private getEntityRepository(documentType: string): Repository<any> | null {
    switch (documentType) {
      case 'invoice':
        return this.invoiceRepository;
      case 'quote':
        return this.quoteRepository;
      case 'delivery-note':
      case 'receipt':
        return this.orderRepository;
      default:
        return null;
    }
  }

  private async fetchDocumentData(
    documentType: DocumentType,
    documentId: number,
  ): Promise<DocumentData> {
    switch (documentType) {
      case 'invoice':
        return this.fetchInvoiceData(documentId);
      case 'quote':
        return this.fetchQuoteData(documentId);
      case 'delivery-note':
        return this.fetchOrderData(documentId, documentType);
      case 'receipt':
        return this.fetchOrderData(documentId, documentType);
      default:
        throw new Error(`Unsupported document type: ${documentType as string}`);
    }
  }

  private async fetchInvoiceData(invoiceId: number): Promise<DocumentData> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items', 'items.product', 'customer', 'supplier'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const isDemandePrix = !!invoice.supplierId;

    const partner = extractPartnerInfo(invoice, isDemandePrix);
    return {
      id: invoice.id,
      documentNumber: invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate || undefined,
      ...partner,
      subtotal: Number(invoice.subtotal) || 0,
      discount: Number(invoice.discount) || 0,
      discountType: Number(invoice.discountType) || 0,
      tax: Number(invoice.tax) || 0,
      total: Number(invoice.total) || 0,
      notes: invoice.notes || undefined,
      status: invoice.status,
      isDemandePrix,
      items: mapDocumentItems(invoice.items),
    };
  }

  private async fetchQuoteData(quoteId: number): Promise<DocumentData> {
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId },
      relations: ['items', 'items.product', 'customer', 'supplier'],
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    const isDemandePrix = !!quote.supplierId;

    const partner = extractPartnerInfo(quote, isDemandePrix);
    return {
      id: quote.id,
      documentNumber: quote.quoteNumber,
      quoteNumber: quote.quoteNumber,
      date: quote.date,
      expirationDate: quote.expirationDate || undefined,
      ...partner,
      subtotal: Number(quote.subtotal) || 0,
      discount: Number(quote.discount) || 0,
      discountType: Number(quote.discountType) || 0,
      tax: Number(quote.tax) || 0,
      total: Number(quote.total) || 0,
      notes: quote.notes || undefined,
      signedBy: quote.signedBy || undefined,
      signedDate: quote.signedDate || undefined,
      isDemandePrix,
      items: mapDocumentItems(quote.items),
    };
  }

  private async fetchOrderData(
    orderId: number,
    documentType: 'delivery-note' | 'receipt',
  ): Promise<DocumentData> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'customer', 'supplier'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const documentNumber =
      documentType === 'receipt' && order.receiptNumber
        ? order.receiptNumber
        : (order.orderNumber ?? order.documentNumber);

    const isDemandePrix = !!order.supplierId;

    return {
      id: order.id,
      documentNumber: documentNumber ?? '',
      orderNumber: order.orderNumber ?? undefined,
      date: order.dateCreated,
      ...extractPartnerInfo(order, isDemandePrix),
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      discountType: Number(order.discountType) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
      originType: order.originType || 'BACKOFFICE',
      isDemandePrix,
      paidAmount: Number(order.paidAmount) || 0,
      items: mapDocumentItems(order.items),
    };
  }

  private getFileName(documentType: DocumentType, data: DocumentData): string {
    if (data.isDemandePrix) {
      if (documentType === 'quote') {
        return `DemandeDePrix_${data.documentNumber}.pdf`;
      } else if (documentType === 'invoice') {
        return `FactureAchat_${data.documentNumber}.pdf`;
      } else if (documentType === 'delivery-note') {
        return `BonAchat_${data.documentNumber}.pdf`;
      }
    }
    const typeMap = {
      invoice: 'Facture',
      quote: 'Devis',
      'delivery-note': 'BonDeLivraison',
      receipt: 'Recu',
    };
    return `${typeMap[documentType]}_${data.documentNumber}.pdf`;
  }

  private async generateA5PDF(
    documentType: DocumentType,
    data: DocumentData,
    lang: 'fr' | 'ar' = 'fr',
  ): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: {
        width: 420,
        height: 595,
      },
      deviceScaleFactor: 2,
    });

    try {
      const htmlContent = this.renderDocumentHTML(documentType, data, lang);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      // Ensure web fonts (Noto Sans Arabic) are fully loaded before rendering
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      await page.evaluate(() => (document as any).fonts.ready);

      const companyConfig = await this.getCompanyConfig();
      const companyLines = this.buildCompanyLines(companyConfig, lang);
      const footerLines = this.buildCompanyFooterLines(companyConfig);

      // Generate header and footer templates
      const headerTemplate = renderHeaderTemplate({
        companyName: companyConfig.companyName || '',
        companyLines,
        logoSrc: await this.resolveLogoSrc(companyConfig.logo),
        documentLabel: this.getDocumentLabel(
          documentType,
          data.isDemandePrix,
          lang,
        ),
        documentNumber: data.documentNumber,
        date: formatDate(data.date),
        dueDate: data.dueDate ? formatDate(data.dueDate) : undefined,
        expirationDate: data.expirationDate
          ? formatDate(data.expirationDate)
          : undefined,
        lang,
      });

      const footerTemplate = renderFooterTemplate({
        footerLines,
        hideVAT:
          data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS',
        lang,
      });

      const pdfBuffer = await page.pdf({
        format: 'A5',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '28mm',
          bottom: '13mm',
          left: '5mm',
          right: '5mm',
        },
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  private async generateReceiptPDF(
    data: DocumentData,
    lang: 'fr' | 'ar' = 'fr',
  ): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: {
        // mm → CSS px (96dpi)
        width: Math.round((RECEIPT_WIDTH_MM * 96) / 25.4),
        height: 3000,
      },
      deviceScaleFactor: 2,
    });

    try {
      const print = await this.buildOrderPrintData('receipt', data, lang);
      const htmlContent = renderReceiptTemplate({
        ...print,
        barcodeSvg: renderCode128Svg(data.documentNumber, 32),
      });
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      // Ensure web fonts (Noto Sans Arabic) are fully loaded before rendering
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      await page.evaluate(() => (document as any).fonts.ready);

      const contentHeight = await page.evaluate(() => {
        // Add a small buffer so Chromium never triggers a second page
        return document.body.scrollHeight + 40;
      });

      const pdfBuffer = await page.pdf({
        width: `${RECEIPT_WIDTH_MM}mm`,
        height: `${contentHeight}px`,
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        preferCSSPageSize: false,
        pageRanges: '1',
        displayHeaderFooter: false,
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  private renderDocumentHTML(
    documentType: DocumentType,
    data: DocumentData,
    lang: 'fr' | 'ar' = 'fr',
  ): string {
    const documentTitle = this.getDocumentTitle(
      documentType,
      data.isDemandePrix,
      lang,
    );
    const documentLabel = this.getDocumentLabel(
      documentType,
      data.isDemandePrix,
      lang,
    );
    const hideVAT =
      data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS';
    // Only hide prices for demande de prix (quotes with supplier), not for facture achat or bon d'achat
    const hidePrices =
      (documentType === 'quote' && data.isDemandePrix) || false;

    // Generate items HTML
    const isRTL = lang === 'ar';
    const totalAlign = 'right'; // total always right in both languages
    const midAlign = isRTL ? 'center' : 'right'; // qty/price/discount/tva center in RTL
    const itemsHtml = data.items
      .map((item) => {
        if (hidePrices) {
          // For demande de prix, only show description and quantity
          return `
              <tr class="table-row">
                <td class="cell-desc">${item.description}</td>
                <td style="text-align: center; font-weight: 600;">${formatQuantity(item.quantity)}</td>
              </tr>
            `;
        } else {
          // Normal quote/invoice with prices
          return `
              <tr class="table-row">
                <td class="cell-desc">${item.description}</td>
                <td style="text-align: center; font-weight: 600;">${formatQuantity(item.quantity)}</td>
                <td class="num" style="text-align: ${midAlign};">${this.formatCurrency(item.unitPrice)}</td>
                <td class="num" style="text-align: ${midAlign};">${this.formatCurrency(item.discount)}</td>
                ${!hideVAT ? `<td class="num" style="text-align: ${midAlign};">${formatQuantity(item.tax)}%</td>` : ''}
                <td class="num" style="text-align: ${totalAlign}; font-weight: 600;">${this.formatCurrency(item.total)}</td>
              </tr>
            `;
        }
      })
      .join('');

    // Calculate total quantity for demande de prix (only for quotes with supplier)
    const totalQuantity = hidePrices
      ? data.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    return renderDocumentTemplate({
      documentTitle,
      documentLabel,
      documentNumber: data.documentNumber,
      date: formatDate(data.date),
      dueDate: data.dueDate ? formatDate(data.dueDate) : undefined,
      expirationDate: data.expirationDate
        ? formatDate(data.expirationDate)
        : undefined,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerIce: data.customerIce,
      documentType,
      signedBy: data.signedBy,
      itemsHtml,
      subtotal: this.formatCurrency(data.subtotal),
      discount: data.discount ? this.formatCurrency(data.discount) : undefined,
      discountType: data.discountType,
      tax: this.formatCurrency(data.tax),
      total: this.formatCurrency(data.total),
      notes: data.notes,
      styles: this.getDocumentStyles(lang),
      hideVAT,
      isPurchaseDocument: data.isDemandePrix,
      isDemandePrix: hidePrices,
      totalQuantity: formatQuantity(totalQuantity),
      lang,
    });
  }

  /** A5 sales delivery note (purchase "bon d'achat" keeps the generic layout). */
  private async generateDeliveryNotePDF(
    data: DocumentData,
    lang: 'fr' | 'ar' = 'fr',
  ): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: { width: 559, height: 794 },
      deviceScaleFactor: 2,
    });

    try {
      const print = await this.buildOrderPrintData('delivery-note', data, lang);
      const htmlContent = renderDeliveryNoteTemplate({
        ...print,
        barcodeSvg: renderCode128Svg(data.documentNumber, 28),
      });
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      await page.evaluate(() => (document as any).fonts.ready);

      return await page.pdf({
        format: 'A5',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: renderDeliveryNotePageFooter(lang),
        margin: DELIVERY_NOTE_MARGINS,
      });
    } finally {
      await page.close();
    }
  }

  /** View-model shared by the A5 delivery note and the 80mm ticket. */
  private async buildOrderPrintData(
    documentType: 'delivery-note' | 'receipt',
    data: DocumentData,
    lang: 'fr' | 'ar',
  ): Promise<OrderPrintData> {
    const ar = lang === 'ar';
    const currency = ar ? 'د.م' : 'DH';
    const money = (v: number) => `${this.formatCurrency(v)} ${currency}`;
    const hideVAT =
      data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS';
    const company = await this.getCompanyConfig();

    const items = data.items.map((item) => {
      const extras = [
        item.discount > 0
          ? `${ar ? 'خصم' : 'Remise'} -${money(item.discount)}`
          : '',
        !hideVAT && item.tax > 0 ? `TVA ${formatQuantity(item.tax)}%` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const calc = `${formatQuantity(item.quantity)} × ${money(item.unitPrice)}`;
      return {
        name: item.description,
        qty: formatQuantity(item.quantity),
        price: this.formatCurrency(item.unitPrice),
        total: this.formatCurrency(item.total),
        sub: extras ? `${calc} · ${extras}` : calc,
        extras,
      };
    });

    const discount = data.discount ?? 0;
    const discountRow =
      discount > 0
        ? {
            label: ar ? 'الخصم' : 'Remise',
            value:
              data.discountType === 1
                ? `-${formatQuantity(discount)}%`
                : `-${money(discount)}`,
          }
        : null;
    const breakdown = hideVAT
      ? discountRow
        ? [
            {
              label: ar ? 'المجموع الجزئي' : 'Sous-total',
              value: money(data.subtotal),
            },
            discountRow,
          ]
        : []
      : [
          {
            label: ar ? 'المجموع بدون ضريبة' : 'Sous-total HT',
            value: money(data.subtotal),
          },
          ...(discountRow ? [discountRow] : []),
          { label: 'TVA', value: money(data.tax) },
        ];

    const lines = data.items.length;
    const units = formatQuantity(
      data.items.reduce((sum, i) => sum + i.quantity, 0),
    );

    const paid = data.paidAmount ?? 0;
    const state = resolvePaymentState(data.total, paid);

    const addressLine = [
      company.address?.trim(),
      [company.city?.trim(), company.zipCode?.trim()].filter(Boolean).join(' '),
      company.country?.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    return {
      lang,
      title: this.getDocumentLabel(documentType, false, lang),
      documentNumber: data.documentNumber,
      date: formatDate(data.date),
      company: {
        name: company.companyName?.trim() || 'MARNOVA',
        addressLine: addressLine || undefined,
        phone: company.phone?.trim() || undefined,
        email: company.email?.trim() || undefined,
        legalLine: this.buildCompanyFooterLines(company)[0],
        logoSrc: await this.resolveLogoSrc(company.logo),
      },
      client: {
        name: data.customerName,
        phone: data.customerPhone,
        address: data.customerAddress,
      },
      status: getPaymentStatusView(
        state,
        lang,
        state === 'partiel' ? money(data.total - paid) : undefined,
      ),
      items,
      linesLabel: ar
        ? `${lines} ${lines > 1 ? 'أصناف' : 'صنف'}`
        : `${lines} article${lines > 1 ? 's' : ''}`,
      unitsLabel: ar
        ? `${units} وحدة في المجموع`
        : `${units} unité${units === '1' ? '' : 's'} au total`,
      breakdown,
      grandTotal: this.formatCurrency(data.total),
      totalWords: ar ? undefined : amountToFrenchWords(data.total),
      currency,
    };
  }

  /**
   * Company logo as something Chromium can render offline: data URIs pass
   * through, stored MinIO images are inlined. Anything else → no logo
   * (the template falls back to the company initial).
   */
  private async resolveLogoSrc(logo?: string): Promise<string | undefined> {
    const ref = logo?.trim();
    if (!ref) return undefined;
    if (ref.startsWith('data:image/')) return ref;
    return (await this.minioProvider.getObjectAsDataUri(ref)) ?? undefined;
  }

  private getDocumentStyles(lang: 'fr' | 'ar' = 'fr'): string {
    return getDocumentStyles(lang);
  }

  private getDocumentTitle(
    documentType: DocumentType,
    isDemandePrix?: boolean,
    lang: 'fr' | 'ar' = 'fr',
  ): string {
    if (lang === 'ar') {
      if (isDemandePrix) {
        if (documentType === 'quote') return 'طلب سعر';
        if (documentType === 'invoice') return 'فاتورة شراء';
        if (documentType === 'delivery-note') return 'وصل شراء';
      }
      const titles: Record<DocumentType, string> = {
        invoice: 'فاتورة',
        quote: 'عرض سعر',
        'delivery-note': 'وصل تسليم',
        receipt: 'إيصال',
      };
      return titles[documentType];
    }
    if (isDemandePrix) {
      if (documentType === 'quote') {
        return 'Demande de Prix';
      } else if (documentType === 'invoice') {
        return "Facture d'Achat";
      } else if (documentType === 'delivery-note') {
        return "Bon d'Achat";
      }
    }
    const titles = {
      invoice: 'Facture',
      quote: 'Devis',
      'delivery-note': 'Bon de Livraison',
      receipt: 'Reçu',
    };
    return titles[documentType];
  }

  private getDocumentLabel(
    documentType: DocumentType,
    isDemandePrix?: boolean,
    lang: 'fr' | 'ar' = 'fr',
  ): string {
    if (lang === 'ar') {
      if (isDemandePrix) {
        if (documentType === 'quote') return 'طلب سعر';
        if (documentType === 'invoice') return 'فاتورة شراء';
        if (documentType === 'delivery-note') return 'وصل شراء';
      }
      const labels: Record<DocumentType, string> = {
        invoice: 'فاتورة',
        quote: 'عرض سعر',
        'delivery-note': 'وصل تسليم',
        receipt: 'إيصال',
      };
      return labels[documentType];
    }
    if (isDemandePrix) {
      if (documentType === 'quote') {
        return 'DEMANDE DE PRIX';
      } else if (documentType === 'invoice') {
        return "FACTURE D'ACHAT";
      } else if (documentType === 'delivery-note') {
        return "BON D'ACHAT";
      }
    }
    const labels = {
      invoice: 'FACTURE',
      quote: 'DEVIS',
      'delivery-note': 'BON DE LIVRAISON',
      receipt: 'REÇU',
    };
    return labels[documentType];
  }

  private formatCurrency(value: any): string {
    try {
      const numValue = Number(value);
      return formatAmount(isNaN(numValue) ? 0 : numValue);
    } catch {
      return formatAmount(0);
    }
  }

  private async getCompanyConfig(): Promise<CompanyConfigData> {
    try {
      const config =
        await this.configurationsService.findByEntity('my_company');
      return (config?.values || {}) as CompanyConfigData;
    } catch {
      return {};
    }
  }

  private buildCompanyLines(
    company: CompanyConfigData,
    lang: 'fr' | 'ar' = 'fr',
  ): string[] {
    const lines: string[] = [];

    const addressParts: string[] = [];
    if (company.address?.trim()) {
      addressParts.push(company.address.trim());
    }

    const cityZip = [company.city?.trim(), company.zipCode?.trim()]
      .filter(Boolean)
      .join(' ');
    if (cityZip) {
      addressParts.push(cityZip);
    }

    if (company.country?.trim()) {
      addressParts.push(company.country.trim());
    }

    if (addressParts.length) {
      lines.push(addressParts.join(', '));
    }

    if (company.phone?.trim()) {
      lines.push(
        `${lang === 'ar' ? 'الهاتف' : 'Tél'}: ${company.phone.trim()}`,
      );
    }

    if (company.email?.trim()) {
      lines.push(
        `${lang === 'ar' ? 'البريد' : 'Email'}: ${company.email.trim()}`,
      );
    }

    return lines;
  }

  private buildCompanyFooterLines(company: CompanyConfigData): string[] {
    const parts: string[] = [];

    if (company.ice?.trim()) {
      parts.push(`ICE: ${company.ice.trim()}`);
    }

    if (company.registrationNumber?.trim()) {
      parts.push(`RC: ${company.registrationNumber.trim()}`);
    }

    if (company.taxId?.trim()) {
      parts.push(`IF: ${company.taxId.trim()}`);
    }

    if (company.vatNumber?.trim()) {
      parts.push(`TVA: ${company.vatNumber.trim()}`);
    }

    return parts.length ? [parts.join(' | ')] : [];
  }
}
