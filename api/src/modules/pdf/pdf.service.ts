/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium } from 'playwright';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { renderDocumentTemplate, renderHeaderTemplate, renderFooterTemplate } from './templates/document.template';
import { renderReceiptTemplate } from './templates/receipt.template';
import { getDocumentStyles } from './templates/document.styles';
import { ConfigurationsService } from '../configurations/configurations.service';
import { Order } from '../orders/entities/order.entity';

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
  fromPortal?: boolean;
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
export class PDFService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly configurationsService: ConfigurationsService,
  ) {}

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
        throw new Error(`Unsupported document type: ${documentType}`);
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

    return {
      id: invoice.id,
      documentNumber: invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate || undefined,
      customerName: isDemandePrix
        ? (invoice.supplierName || invoice.supplier?.name || 'Fournisseur')
        : (invoice.customerName || invoice.customer?.name || 'Client'),
      customerPhone: isDemandePrix
        ? (invoice.supplierPhone || invoice.supplier?.phoneNumber)
        : (invoice.customerPhone || invoice.customer?.phoneNumber),
      customerAddress: isDemandePrix
        ? (invoice.supplierAddress || invoice.supplier?.address)
        : (invoice.customerAddress || invoice.customer?.address),
      subtotal: Number(invoice.subtotal) || 0,
      discount: Number(invoice.discount) || 0,
      discountType: Number(invoice.discountType) || 0,
      tax: Number(invoice.tax) || 0,
      total: Number(invoice.total) || 0,
      notes: invoice.notes || undefined,
      status: invoice.status,
      isDemandePrix,
      supplierName: isDemandePrix ? (invoice.supplierName || invoice.supplier?.name) : undefined,
      items: invoice.items.map((item) => ({
        description: item.description || item.product?.name || 'Article',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || 0,
      })),
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

    return {
      id: quote.id,
      documentNumber: quote.quoteNumber,
      quoteNumber: quote.quoteNumber,
      date: quote.date,
      expirationDate: quote.expirationDate || undefined,
      customerName: isDemandePrix 
        ? (quote.supplierName || quote.supplier?.name || 'Fournisseur')
        : (quote.customerName || quote.customer?.name || 'Client'),
      customerPhone: isDemandePrix
        ? (quote.supplierPhone || quote.supplier?.phoneNumber)
        : (quote.customerPhone || quote.customer?.phoneNumber),
      customerAddress: isDemandePrix
        ? (quote.supplierAddress || quote.supplier?.address)
        : (quote.customerAddress || quote.customer?.address),
      subtotal: Number(quote.subtotal) || 0,
      discount: Number(quote.discount) || 0,
      discountType: Number(quote.discountType) || 0,
      tax: Number(quote.tax) || 0,
      total: Number(quote.total) || 0,
      notes: quote.notes || undefined,
      signedBy: quote.signedBy || undefined,
      signedDate: quote.signedDate || undefined,
      isDemandePrix,
      supplierName: isDemandePrix ? (quote.supplierName || quote.supplier?.name) : undefined,
      items: quote.items.map((item) => ({
        description: item.description || item.product?.name || 'Article',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || 0,
      })),
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
        : order.orderNumber;

    const isDemandePrix = !!order.supplierId;

    return {
      id: order.id,
      documentNumber,
      orderNumber: order.orderNumber,
      date: order.dateCreated,
      customerName: isDemandePrix
        ? (order.supplierName || order.supplier?.name || 'Fournisseur')
        : (order.customerName || order.customer?.name || 'Client'),
      customerPhone: isDemandePrix
        ? (order.supplierPhone || order.supplier?.phoneNumber)
        : (order.customerPhone || order.customer?.phoneNumber),
      customerAddress: isDemandePrix
        ? (order.supplierAddress || order.supplier?.address)
        : (order.customerAddress || order.customer?.address),
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      discountType: Number(order.discountType) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
      fromPortal: order.fromPortal || false,
      isDemandePrix,
      supplierName: isDemandePrix ? (order.supplierName || order.supplier?.name) : undefined,
      items: order.items.map((item) => ({
        description: item.description || item.product?.name || 'Article',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || 0,
      })),
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
      'invoice': 'Facture',
      'quote': 'Devis',
      'delivery-note': 'BonDeLivraison',
      'receipt': 'Recu',
    };
    return `${typeMap[documentType]}_${data.documentNumber}.pdf`;
  }

  private async generateA5PDF(
    documentType: DocumentType,
    data: DocumentData,
  ): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      // A5 dimensions: 148x210 mm (420x595 pixels at 72 DPI)
      const page = await browser.newPage({
        viewport: {
          width: 420,
          height: 595,
        },
        deviceScaleFactor: 2,
      });

      const htmlContent = this.renderDocumentHTML(documentType, data);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

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
        dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString('fr-FR') : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate).toLocaleDateString('fr-FR') : undefined,
      });

      const footerTemplate = renderFooterTemplate({ 
        footerLines,
        hideVAT: data.fromPortal || false,
      });

      const pdfBuffer = await page.pdf({
        format: 'A5',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '33mm',
          bottom: '12mm',
          left: '5mm',
          right: '5mm',
        },
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  private async generateReceiptPDF(data: DocumentData): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage({
        viewport: {
          width: 302,
          height: 3000,
        },
        deviceScaleFactor: 2,
      });

      const companyConfig = await this.getCompanyConfig();
      const htmlContent = this.renderReceiptHTML(data, companyConfig);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const contentHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      const pdfBuffer = await page.pdf({
        width: '80mm',
        height: `${contentHeight}px`,
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  private renderDocumentHTML(documentType: DocumentType, data: DocumentData): string {
    const documentTitle = this.getDocumentTitle(documentType, data.isDemandePrix);
    const documentLabel = this.getDocumentLabel(documentType, data.isDemandePrix);
    const hideVAT = data.fromPortal || false;
    // Only hide prices for demande de prix (quotes with supplier), not for facture achat or bon d'achat
    const hidePrices = (documentType === 'quote' && data.isDemandePrix) || false;

    // Generate items HTML
    const itemsHtml = data.items
      .map(
        (item, index) => {
          if (hidePrices) {
            // For demande de prix, only show description and quantity
            return `
              <tr class="table-row" style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}">
                <td style="text-align: left; padding: 2mm 1.5mm;">${item.description}</td>
                <td style="text-align: center; font-weight: bold; padding: 2mm 1.5mm;">${item.quantity}</td>
              </tr>
            `;
          } else {
            // Normal quote/invoice with prices
            return `
              <tr class="table-row" style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}">
                <td style="text-align: left; padding: 2mm 1.5mm;">${item.description}</td>
                <td style="text-align: center; font-weight: bold; padding: 2mm 1.5mm;">${item.quantity}</td>
                <td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.unitPrice)}</td>
                <td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.discount)}</td>
                ${!hideVAT ? `<td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${item.tax}%</td>` : ''}
                <td style="text-align: right; font-weight: bold; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.total)}</td>
              </tr>
            `;
          }
        },
      )
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
      dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString('fr-FR') : undefined,
      expirationDate: data.expirationDate ? new Date(data.expirationDate).toLocaleDateString('fr-FR') : undefined,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
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

  private renderReceiptHTML(data: DocumentData, company: CompanyConfigData): string {
    const hideVAT = data.fromPortal || false;
    const companyLines = this.buildCompanyLines(company);
    
    // Generate items HTML
    const itemsHtml = data.items
      .map(
        (item) => `
          <div class="item">
            <div style="font-weight: bold;">${item.description}</div>
            <div style="display: flex; justify-content: space-between;">
              <span>${item.quantity} x ${this.formatCurrency(item.unitPrice)}</span>
              <span>${this.formatCurrency(item.total)} DH</span>
            </div>
            ${item.discount > 0 ? `<div style="font-size: 6pt; color: #666;">Remise: ${this.formatCurrency(item.discount)} DH</div>` : ''}
            ${!hideVAT && item.tax > 0 ? `<div style="font-size: 6pt; color: #666;">TVA: ${this.formatCurrency(item.tax)}%</div>` : ''}
          </div>
        `,
      )
      .join('');

    return renderReceiptTemplate({
      documentNumber: data.documentNumber,
      date: new Date(data.date).toLocaleDateString('fr-FR'),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      itemsHtml,
      subtotal: this.formatCurrency(data.subtotal),
      discount: data.discount && data.discount > 0 ? this.formatCurrency(data.discount) : undefined,
      discountType: data.discountType,
      tax: this.formatCurrency(data.tax),
      total: this.formatCurrency(data.total),
      hideVAT,
      companyName: company.companyName || 'ORDERIUM',
      companyLines,
    });
  }

  private getDocumentStyles(): string {
    return getDocumentStyles();
  }

  private getDocumentTitle(documentType: DocumentType, isDemandePrix?: boolean): string {
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
      'invoice': 'Facture',
      'quote': 'Devis',
      'delivery-note': 'Bon de Livraison',
      'receipt': 'Reçu',
    };
    return titles[documentType];
  }

  private getDocumentLabel(documentType: DocumentType, isDemandePrix?: boolean): string {
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
      'invoice': 'FACTURE',
      'quote': 'DEVIS',
      'delivery-note': 'BON DE LIVRAISON',
      'receipt': 'REÇU',
    };
    return labels[documentType];
  }

  private formatCurrency(value: any): string {
    try {
      const numValue = Number(value);
      return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
    } catch (error) {
      return '0.00';
    }
  }

  private async getCompanyConfig(): Promise<CompanyConfigData> {
    try {
      const config = await this.configurationsService.findByEntity('my_company');
      return (config?.values || {}) as CompanyConfigData;
    } catch (error) {
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
