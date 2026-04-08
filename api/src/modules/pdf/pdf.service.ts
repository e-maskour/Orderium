import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { chromium, Browser } from 'playwright';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote } from '../quotes/entities/quote.entity';
import {
  renderDocumentTemplate,
  renderHeaderTemplate,
  renderFooterTemplate,
} from './templates/document.template';
import { renderReceiptTemplate } from './templates/receipt.template';
import { getDocumentStyles } from './templates/document.styles';
import { ConfigurationsService } from '../configurations/configurations.service';
import { Order } from '../orders/entities/order.entity';
import { MinioProvider } from '../images/providers/minio.provider';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { extractPartnerInfo, mapDocumentItems } from './pdf.helpers';

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
}

@Injectable()
export class PDFService implements OnModuleDestroy {
  private readonly logger = new Logger(PDFService.name);

  /** Singleton browser instance — launched lazily, reused across all PDF jobs */
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    private readonly minioProvider: MinioProvider,
  ) { }

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
  ): Promise<PDFGenerationResult> {
    const documentData = await this.fetchDocumentData(documentType, documentId);

    if (documentType === 'receipt') {
      const pdfBuffer = await this.generateReceiptPDF(documentData);
      return {
        pdfBuffer,
        fileName: `Recu_${documentData.documentNumber}.pdf`,
      };
    }

    const pdfBuffer = await this.generateA5PDF(documentType, documentData);
    const fileName = this.getFileName(documentType, documentData);

    return { pdfBuffer, fileName };
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
    await entityRepo.update(documentId, { pdfUrl: newUrl } as Record<string, unknown>);

    this.logger.log(`🔄 PDF regenerated for ${documentType} #${documentId}: ${newUrl}`);
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
        : order.orderNumber ?? order.documentNumber;

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
  ): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: {
        width: 420,
        height: 595,
      },
      deviceScaleFactor: 2,
    });

    try {
      const htmlContent = this.renderDocumentHTML(documentType, data);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      // Ensure web fonts (Noto Sans Arabic) are fully loaded before rendering
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      await page.evaluate(() => (document as any).fonts.ready);

      const companyConfig = await this.getCompanyConfig();
      const companyLines = this.buildCompanyLines(companyConfig);
      const footerLines = this.buildCompanyFooterLines(companyConfig);

      // Generate header and footer templates
      const headerTemplate = renderHeaderTemplate({
        companyName: companyConfig.companyName || '',
        companyLines,
        documentLabel: this.getDocumentLabel(documentType, data.isDemandePrix),
        documentNumber: data.documentNumber,
        date: new Date(data.date).toLocaleDateString('fr-FR'),
        dueDate: data.dueDate
          ? new Date(data.dueDate).toLocaleDateString('fr-FR')
          : undefined,
        expirationDate: data.expirationDate
          ? new Date(data.expirationDate).toLocaleDateString('fr-FR')
          : undefined,
      });

      const footerTemplate = renderFooterTemplate({
        footerLines,
        hideVAT: data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS',
      });

      const pdfBuffer = await page.pdf({
        format: 'A5',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '32mm',
          bottom: '14mm',
          left: '5mm',
          right: '5mm',
        },
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  private async generateReceiptPDF(data: DocumentData): Promise<Buffer> {
    const page = await this.getNewPage({
      viewport: {
        width: 302,
        height: 3000,
      },
      deviceScaleFactor: 2,
    });

    try {
      const companyConfig = await this.getCompanyConfig();
      const htmlContent = this.renderReceiptHTML(data, companyConfig);
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
        width: '80mm',
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
  ): string {
    const documentTitle = this.getDocumentTitle(
      documentType,
      data.isDemandePrix,
    );
    const documentLabel = this.getDocumentLabel(
      documentType,
      data.isDemandePrix,
    );
    const hideVAT = data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS';
    // Only hide prices for demande de prix (quotes with supplier), not for facture achat or bon d'achat
    const hidePrices =
      (documentType === 'quote' && data.isDemandePrix) || false;

    // Generate items HTML
    const itemsHtml = data.items
      .map((item) => {
        if (hidePrices) {
          // For demande de prix, only show description and quantity
          return `
              <tr class="table-row">
                <td class="cell-desc">${item.description}</td>
                <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
              </tr>
            `;
        } else {
          // Normal quote/invoice with prices
          return `
              <tr class="table-row">
                <td class="cell-desc">${item.description}</td>
                <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                <td class="num" style="text-align: right;">${this.formatCurrency(item.unitPrice)}</td>
                <td class="num" style="text-align: right;">${this.formatCurrency(item.discount)}</td>
                ${!hideVAT ? `<td class="num" style="text-align: right;">${item.tax}%</td>` : ''}
                <td class="num" style="text-align: right; font-weight: 600;">${this.formatCurrency(item.total)}</td>
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
      date: new Date(data.date).toLocaleDateString('fr-FR'),
      dueDate: data.dueDate
        ? new Date(data.dueDate).toLocaleDateString('fr-FR')
        : undefined,
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate).toLocaleDateString('fr-FR')
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
      styles: this.getDocumentStyles(),
      hideVAT,
      isPurchaseDocument: data.isDemandePrix,
      isDemandePrix: hidePrices,
      totalQuantity: totalQuantity.toString(),
    });
  }

  private renderReceiptHTML(
    data: DocumentData,
    company: CompanyConfigData,
  ): string {
    const hideVAT = data.originType === 'CLIENT_POS' || data.originType === 'ADMIN_POS';
    const companyLines = this.buildCompanyLines(company);

    // Generate items HTML — table rows for the new design
    const itemsHtml = data.items
      .map((item) => {
        const discountSub =
          item.discount > 0
            ? `Remise: -${this.formatCurrency(item.discount)} DH`
            : '';
        const taxSub = !hideVAT && item.tax > 0 ? `TVA: ${item.tax}%` : '';
        const subParts = [discountSub, taxSub].filter(Boolean).join(' · ');
        const qtyLine = `${item.quantity} × ${this.formatCurrency(item.unitPrice)} DH${subParts ? ' · ' + subParts : ''}`;
        return `<tr class="t-item">
            <td class="t-desc">
              ${item.description}
              <span class="t-desc-sub">${qtyLine}</span>
            </td>
            <td class="t-total">${this.formatCurrency(item.total)}</td>
          </tr>`;
      })
      .join('');

    const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalProducts = data.items.length;

    return renderReceiptTemplate({
      documentNumber: data.documentNumber,
      date: new Date(data.date).toLocaleDateString('fr-FR'),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      itemsHtml,
      totalQty,
      totalProducts,
      subtotal: this.formatCurrency(data.subtotal),
      discount:
        data.discount && data.discount > 0
          ? this.formatCurrency(data.discount)
          : undefined,
      discountType: data.discountType,
      tax: this.formatCurrency(data.tax),
      total: this.formatCurrency(data.total),
      hideVAT,
      companyName: company.companyName || 'MOROCOM',
      companyLines,
    });
  }

  private getDocumentStyles(): string {
    return getDocumentStyles();
  }

  private getDocumentTitle(
    documentType: DocumentType,
    isDemandePrix?: boolean,
  ): string {
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
  ): string {
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
      return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
    } catch {
      return '0.00';
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

  private buildCompanyLines(company: CompanyConfigData): string[] {
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
      lines.push(`Tél: ${company.phone.trim()}`);
    }

    if (company.email?.trim()) {
      lines.push(`Email: ${company.email.trim()}`);
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
