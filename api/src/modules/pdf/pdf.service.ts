/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium } from 'playwright';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { OrdersService } from '../orders/orders.service';
import { renderDocumentTemplate, renderHeaderTemplate, renderFooterTemplate } from './templates/document.template';
import { renderReceiptTemplate } from './templates/receipt.template';
import { getDocumentStyles } from './templates/document.styles';

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
}

interface DocumentItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

@Injectable()
export class PDFService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly ordersService: OrdersService,
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
      case 'receipt':
        return this.fetchOrderData(documentId);
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  private async fetchInvoiceData(invoiceId: number): Promise<DocumentData> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items', 'items.product', 'customer'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    return {
      id: invoice.id,
      documentNumber: invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate || undefined,
      customerName: invoice.customerName || invoice.customer?.name || 'Client',
      customerPhone: invoice.customerPhone || invoice.customer?.phoneNumber,
      customerAddress: invoice.customerAddress || invoice.customer?.address,
      subtotal: Number(invoice.subtotal) || 0,
      tax: Number(invoice.tax) || 0,
      total: Number(invoice.total) || 0,
      notes: invoice.notes || undefined,
      status: invoice.status,
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
      relations: ['items', 'items.product', 'customer'],
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    return {
      id: quote.id,
      documentNumber: quote.quoteNumber,
      quoteNumber: quote.quoteNumber,
      date: quote.date,
      expirationDate: quote.expirationDate || undefined,
      customerName: quote.customerName || quote.customer?.name || 'Client',
      customerPhone: quote.customerPhone || quote.customer?.phoneNumber,
      customerAddress: quote.customerAddress || quote.customer?.address,
      subtotal: Number(quote.subtotal) || 0,
      tax: Number(quote.tax) || 0,
      total: Number(quote.total) || 0,
      notes: quote.notes || undefined,
      signedBy: quote.signedBy || undefined,
      signedDate: quote.signedDate || undefined,
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

  private async fetchOrderData(orderId: number): Promise<DocumentData> {
    const order = await this.ordersService.getOrderById(orderId);

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return {
      id: order.id,
      documentNumber: order.orderNumber,
      orderNumber: order.orderNumber,
      date: order.dateCreated,
      customerName: order.customer?.name || 'Client',
      customerPhone: order.customer?.phone,
      customerAddress: order.customerAddress || order.customer?.address,
      subtotal: Number(order.subtotal) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
      items: order.items.map((item) => ({
        description: item.description || item.product?.name || 'Article',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || 0,
      })),
    };
  }

  private getFileName(documentType: DocumentType, data: DocumentData): string {
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
      const page = await browser.newPage({
        viewport: {
          width: 595,
          height: 842,
        },
        deviceScaleFactor: 2,
      });

      const htmlContent = this.renderDocumentHTML(documentType, data);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Generate header and footer templates
      const headerTemplate = renderHeaderTemplate({
        documentLabel: this.getDocumentLabel(documentType),
        documentNumber: data.documentNumber,
        date: new Date(data.date).toLocaleDateString('fr-FR'),
        dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString('fr-FR') : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate).toLocaleDateString('fr-FR') : undefined,
      });

      const footerTemplate = renderFooterTemplate();

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

      const htmlContent = this.renderReceiptHTML(data);
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
    const documentTitle = this.getDocumentTitle(documentType);
    const documentLabel = this.getDocumentLabel(documentType);

    // Generate items HTML
    const itemsHtml = data.items
      .map(
        (item, index) => `
            <tr class="table-row" style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}">
              <td style="text-align: left; padding: 2mm 1.5mm;">${item.description}</td>
              <td style="text-align: center; font-weight: bold; padding: 2mm 1.5mm;">${item.quantity}</td>
              <td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.unitPrice)}</td>
              <td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.discount)}</td>
              <td style="text-align: right; font-family: monospace; padding: 2mm 1.5mm;">${item.tax}%</td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; padding: 2mm 1.5mm;">${this.formatCurrency(item.total)}</td>
            </tr>
          `,
      )
      .join('');

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
      tax: this.formatCurrency(data.tax),
      total: this.formatCurrency(data.total),
      notes: data.notes,
      styles: this.getDocumentStyles(),
    });
  }

  private renderReceiptHTML(data: DocumentData): string {
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
            ${item.tax > 0 ? `<div style="font-size: 6pt; color: #666;">TVA: ${this.formatCurrency(item.tax)}%</div>` : ''}
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
      tax: this.formatCurrency(data.tax),
      total: this.formatCurrency(data.total),
    });
  }

  private getDocumentStyles(): string {
    return getDocumentStyles();
  }

  private getDocumentTitle(documentType: DocumentType): string {
    const titles = {
      'invoice': 'Facture',
      'quote': 'Devis',
      'delivery-note': 'Bon de Livraison',
      'receipt': 'Reçu',
    };
    return titles[documentType];
  }

  private getDocumentLabel(documentType: DocumentType): string {
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
}
