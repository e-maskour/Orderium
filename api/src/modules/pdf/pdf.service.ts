/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface PageData {
  pageNumber: number;
  items: OrderItem[];
  isLast: boolean;
}

interface OrderData {
  id: number;
  number: string;
  orderNumber?: string | null;
  total: number;
  dateCreated: Date;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  items: OrderItem[];
}

interface OrderItem {
  id?: number;
  quantity: number;
  price: number;
  product?: {
    id?: number;
    name?: string;
    description?: string;
    price?: number;
  };
  total: number;
}

@Injectable()
export class PDFService {
  // Enhanced method to safely handle all monetary values
  private safeMoneyFormat(value: any): string {
    try {
      const numValue = Number(value);
      return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
    } catch (error) {
      console.error('Error formatting money value:', value, error);
      return '0.00';
    }
  }

  // Override existing formatCurrency method with enhanced error handling
  private formatCurrency(value: any): string {
    return this.safeMoneyFormat(value);
  }

  private validateOrderData(orderData: OrderData): void {
    if (!orderData) {
      throw new Error('Order data is required');
    }

    // Ensure items array exists
    if (!Array.isArray(orderData.items)) {
      orderData.items = [];
    }

    // Sanitize each item's numeric values using actual OrderItem fields
    orderData.items = orderData.items.map((item: OrderItem): OrderItem => {
      // Use the actual fields from OrderItem database structure
      const price: number = typeof item.price === 'number' ? item.price : Number(item.price || 0);
      const quantity: number = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity || 0);
      const total: number = typeof item.total === 'number' ? item.total : Number(item.total || 0);
      
      const sanitizedItem: OrderItem = {
        ...item,
        // Ensure these core fields are always numbers for calculations
        price: isNaN(price) ? 0 : price,
        quantity: isNaN(quantity) ? 0 : quantity,
        total: isNaN(total) ? 0 : total
      };
      
      return sanitizedItem;
    });

    // Calculate total from items if not present or invalid
    if (orderData.total === undefined || orderData.total === null || isNaN(Number(orderData.total))) {
      console.log('Total is missing or invalid, calculating from items');
      orderData.total = orderData.items.reduce((sum: number, item: OrderItem): number => {
        // Use the total field from OrderItem, fallback to price * quantity calculation
        const itemTotal = Number(item.total || (Number(item.price) * Number(item.quantity)) || 0);
        return sum + itemTotal;
      }, 0);
    } else {
      // Ensure total is a number
      orderData.total = Number(orderData.total);
    }

    console.log('Order validation complete. Total:', orderData.total, 'Items count:', orderData.items.length);
  }
  async generateInvoicePDF(orderData: OrderData): Promise<Buffer> {
    // Validate and sanitize order data to prevent runtime errors
    this.validateOrderData(orderData);
    console.log('Order data validated for PDF generation');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--font-render-hinting=none',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set viewport for A5 dimensions
      await page.setViewport({
        width: 595, // A5 width in pixels at 96 DPI
        height: 842, // A5 height in pixels at 96 DPI
        deviceScaleFactor: 2,
      });

      // Generate HTML content
      const htmlContent = this.renderInvoiceHTML(orderData);

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generate PDF with full CSS support
      const pdfBuffer = await page.pdf({
        format: 'A5',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generateReceiptPDF(orderData: OrderData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set viewport for 80mm receipt
      await page.setViewport({
        width: 302, // 80mm in pixels
        height: 3000, // Large height for continuous receipt
        deviceScaleFactor: 2,
      });

      const htmlContent = this.renderReceiptHTML(orderData);

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Get the actual content height to ensure single page
      const contentHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      const pdfBuffer = await page.pdf({
        width: '80mm',
        height: `${contentHeight}px`,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private renderInvoiceHTML(orderData: OrderData): string {
    const totalTVA: number = orderData.total * 0.2;
    const totalTTC: number = orderData.total * 1.2;

    // Ensure items array exists and has content
    const items: OrderItem[] = orderData.items || [];
    if (items.length === 0) {
      console.warn('Order has no items:', orderData.id);
    }

    // Calculate pagination - first page has 15 items, subsequent pages have 18 items
    const firstPageItems: number = 15;
    const subsequentPageItems: number = 18;
    
    const pages: PageData[] = [];
    let remainingItems = items.length;
    let currentIndex = 0;
    let pageNumber = 1;
    
    while (remainingItems > 0) {
      const itemsForThisPage = pageNumber === 1 ? firstPageItems : subsequentPageItems;
      const itemsToTake = Math.min(itemsForThisPage, remainingItems);
      const pageItems = items.slice(currentIndex, currentIndex + itemsToTake);
      
      pages.push({
        pageNumber: pageNumber,
        items: pageItems,
        isLast: currentIndex + itemsToTake >= items.length,
      });
      
      currentIndex += itemsToTake;
      remainingItems -= itemsToTake;
      pageNumber++;
    }
    
    const totalPages = pages.length;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${orderData.orderNumber || orderData.number}</title>
          <style>
            @page {
              size: A5;
              margin: 0;
            }
            
            @media print {
              .page-break {
                page-break-before: always;
              }
              .no-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              .table-row {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
            
            body {
              font-family: "DejaVu Sans", "Helvetica", "Arial", sans-serif;
              background-color: #ffffff;
              width: 148mm;
              margin: 0;
              padding: 0;
              font-size: 9pt;
              color: #000000;
              line-height: 1.3;
              box-sizing: border-box;
            }
            
            .invoice-page {
              height: 210mm;
              display: flex;
              flex-direction: column;
              background-color: #ffffff;
              position: relative;
              box-sizing: border-box;
            }
            
            .header {
              padding: 5mm 6mm 3mm 6mm;
              background-color: #ffffff;
            }
            
            .header-simplified {
              border-bottom: 0.5pt solid #DDDDDD;
            }
            
            .header-first {
              border-bottom: 1.5pt solid #000000;
            }
            
            .company-info {
              width: 70mm;
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 1mm;
              color: #000000;
              letter-spacing: 0.3pt;
            }
            
            .company-details {
              font-size: 8pt;
              line-height: 1.4;
              color: #222222;
            }
            
            .document-title {
              text-align: right;
              padding-top: 1mm;
            }
            
            .invoice-title {
              font-size: 15pt;
              font-weight: bold;
              color: #000000;
              margin-bottom: 2mm;
            }
            
            .invoice-meta {
              font-size: 8pt;
              color: #666666;
            }
            
            .customer-section {
              padding: 4mm 0;
            }
            
            .customer-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4mm;
            }
            
            .bill-to, .invoice-details {
              width: 45%;
            }
            
            .section-title {
              font-size: 8pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2mm;
              color: #666666;
            }
            
            .info-box {
              font-size: 10pt;
              line-height: 1.4;
              border: 1px solid #DDDDDD;
              padding: 3mm;
              background-color: #FAFAFA;
            }
            
            .table-section {
              padding: 0;
              flex: 1;
            }
            
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 3mm;
              table-layout: fixed; /* Fixed layout for consistent spacing */
            }
            
            .table-header {
              background-color: #F8F9FA;
            }
            
            .table-header th {
              border: 0.75pt solid #CCCCCC;
              padding: 1mm 1mm;
              font-weight: bold;
              color: #000000;
            }
            
            .table-row td {
              border: 1px solid #DDDDDD;
              padding: 1mm 1mm; /* Minimal padding */
              vertical-align: middle;
              height: 5mm; /* Compact row height */
              font-size: 8pt; /* Slightly smaller font */
            }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 4mm;
              margin-bottom: 4mm;
            }
            
            .totals-table {
              width: 50%;
              border-collapse: collapse;
            }
            
            .content-wrapper {
              flex: 1;
              overflow: hidden;
              padding: 0 6mm;
            }
            
            .footer {
              border-top: 0.5pt solid #DDDDDD;
              padding: 2.5mm 8mm 5mm 8mm;
              font-size: 6.5pt;
              color: #777777;
              line-height: 1.3;
              background-color: #ffffff;
              flex-shrink: 0;
            }
          </style>
        </head>
        <body>
          <div class="invoice-content">
            ${pages
              .map(
                (page: PageData, pageIndex: number): string => `
              <div class="invoice-page ${pageIndex > 0 ? 'page-break' : ''}">
                <!-- Header -->
                <div class="header ${page.pageNumber > 1 ? 'header-simplified' : 'header-first'}">
                  <div style="display: flex; justify-content: space-between; padding-bottom: ${page.pageNumber === 1 ? '1mm' : '2mm'};">
                    <div class="company-info">
                      ORDERIUM
                      ${
                        page.pageNumber === 1
                          ? `
                        <div class="company-details">
                          <div>123 Avenue Mohammed V</div>
                          <div>Casablanca 20000, Maroc</div>
                          <div style="margin-top: 1.5mm;">Tél: +212 5XX-XXXXXX</div>
                          <div>Email: contact@orderium.ma</div>
                        </div>
                      `
                          : ''
                      }
                    </div>
                    <div class="document-title">
                      <div class="invoice-title">FACTURE</div>
                      <div class="invoice-meta">
                        <div style="margin-bottom: 1mm;">N° ${orderData.orderNumber || orderData.number}</div>
                        <div>Date: ${new Date(orderData.dateCreated).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Content Wrapper -->
                <div class="content-wrapper">
                ${
                  page.pageNumber === 1
                    ? `
                  <!-- Customer Info -->
                  <div class="customer-section">
                    <div class="customer-grid">
                      <div class="bill-to">
                        <div class="section-title">Facturé à</div>
                        <div class="info-box">
                          <div style="font-weight: bold; margin-bottom: 1mm;">${orderData.customer?.name || 'Customer'}</div>
                          <div style="font-size: 8pt; color: #666666;">Tél: ${orderData.customer?.phone || 'N/A'}</div>
                          ${orderData.customer?.address ? `<div style="font-size: 8pt; color: #666666; margin-top: 1mm;">${orderData.customer.address}</div>` : ''}
                        </div>
                      </div>
                      <div class="invoice-details">
                        <div class="section-title">Détails de la facture</div>
                        <div class="info-box" style="font-size: 9pt; line-height: 1.6;">
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Date:</span>
                            <span style="font-weight: 600;">${new Date(orderData.dateCreated).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Commande N°:</span>
                            <span style="font-weight: 600;">${orderData.orderNumber || orderData.number}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Statut:</span>
                            <span style="font-weight: 600; color: #10B981;">Confirmée</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                `
                    : ''
                }

                <!-- Table -->
                <div class="table-section">
                  <table class="invoice-table">
                    <thead class="table-header">
                      <tr>
                        <th style="text-align: center; width: 8%;">Code</th>
                        <th style="text-align: left; width: 40%;">Description</th>
                        <th style="text-align: center; width: 9%;">TVA</th>
                        <th style="text-align: right; width: 15%;">P.U. HT</th>
                        <th style="text-align: center; width: 10%;">Qté</th>
                        <th style="text-align: right; width: 18%;">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${page.items
                        .map((item: OrderItem, index: number): string => {
                          // Use OrderItem fields directly - price, quantity, total
                          const price: number = Number(item.price || 0);
                          const quantity: number = Number(item.quantity || 1);
                          const total: number = Number(item.total || (price * quantity));
                          const productId: number = item.product?.id || 0;
                          const productName: string = item.product?.name || 'Product';
                          const productDescription: string = item.product?.description || '';

                          return `
                          <tr class="table-row no-break" style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}">
                            <td style="text-align: center; color: #777777; font-size: 7pt;">
                              ${String(productId).padStart(4, '0')}
                            </td>
                            <td style="text-align: left; line-height: 1.1; font-size: 8pt;">
                              <div style="font-weight: 600; margin-bottom: 0; font-size: 8pt;">${productName}</div>
                              ${productDescription ? `<div style="font-size: 6.5pt; color: #666666; line-height: 1; overflow: hidden; text-overflow: ellipsis;">${productDescription.substring(0, 45)}${productDescription.length > 45 ? '...' : ''}</div>` : ''}
                            </td>
                            <td style="text-align: center;">20%</td>
                            <td style="text-align: right; font-family: monospace;">${this.formatCurrency(price)}</td>
                            <td style="text-align: center; font-weight: bold;">${quantity}</td>
                            <td style="text-align: right; font-weight: bold; font-family: monospace;">${this.formatCurrency(total)}</td>
                          </tr>
                        `;
                        })
                        .join('')}
                    </tbody>
                  </table>

                  ${(page.isLast && page.pageNumber === totalPages)
                      ? `
                    <!-- Totals - Only on the final page -->
                    <div class="totals-section">
                      <div class="totals-table">
                        <table style="width: 100%; border-collapse: collapse;">
                          <tbody>
                            <tr>
                              <td style="padding: 1.5mm 3mm; text-align: right; font-weight: bold; background-color: #F8F9FA; border: 1px solid #DDDDDD;">
                                Sous-total HT:
                              </td>
                              <td style="padding: 1.5mm 3mm; text-align: right; font-family: monospace; font-weight: bold; background-color: #F8F9FA; border: 1px solid #DDDDDD;">
                                ${this.formatCurrency(orderData.total)} DH
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 1.5mm 3mm; text-align: right; font-weight: bold; background-color: #F8F9FA; border: 1px solid #DDDDDD;">
                                TVA (20%):
                              </td>
                              <td style="padding: 1.5mm 3mm; text-align: right; font-family: monospace; font-weight: bold; background-color: #F8F9FA; border: 1px solid #DDDDDD;">
                                ${this.formatCurrency(totalTVA)} DH
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 2mm 3mm; text-align: right; font-weight: bold; font-size: 10pt; background-color: #E5E7EB; border: 1.5pt solid #9CA3AF;">
                                Total TTC:
                              </td>
                              <td style="padding: 2mm 3mm; text-align: right; font-family: monospace; font-weight: bold; font-size: 10pt; background-color: #E5E7EB; border: 1.5pt solid #9CA3AF;">
                                ${this.formatCurrency(totalTTC)} DH
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `
                      : ''
                  }
                </div>
                </div><!-- End Content Wrapper -->

                <!-- Footer -->
                <div class="footer">
                  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="max-width: 100mm;">
                      <div style="font-weight: 600; color: #555555;">ORDERIUM - Système de gestion des commandes</div>
                      <div style="margin-top: 0.5mm;">RC: XXXXXXX | IF: XXXXXXXX | ICE: XXXXXXXXXXXXXXX</div>
                    </div>
                    <div style="text-align: right; font-size: 6pt; color: #999999;">
                      Page ${page.pageNumber}/${totalPages}
                    </div>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </body>
      </html>
    `;
  }

  private renderReceiptHTML(orderData: OrderData): string {
    // Similar structure for receipts but with 80mm width
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt ${orderData.orderNumber || orderData.number}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            body {
              font-family: "Courier New", monospace;
              background-color: #ffffff;
              width: 80mm;
              margin: 0;
              padding: 0;
              font-size: 8pt;
              color: #000000;
              line-height: 1.2;
            }
            
            .receipt-content {
              padding: 3mm;
            }
            
            .header {
              text-align: center;
              margin-bottom: 3mm;
              font-weight: bold;
            }
            
            .divider {
              border-top: 1px dashed #000;
              margin: 2mm 0;
            }
            
            .items {
              margin: 2mm 0;
            }
            
            .item {
              margin-bottom: 1mm;
              padding-bottom: 1mm;
              border-bottom: 1px dotted #CCCCCC;
            }
            
            .totals {
              margin-top: 3mm;
              padding-top: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            <div class="header">
              <div style="font-size: 12pt;">ORDERIUM</div>
              <div style="font-size: 7pt;">123 Avenue Mohammed V</div>
              <div style="font-size: 7pt;">Casablanca 20000, Maroc</div>
              <div style="font-size: 7pt;">Tel: +212 5XX-XXXXXX</div>
            </div>
            
            <div class="divider"></div>
            
            <div style="text-align: center; font-weight: bold; margin: 2mm 0;">
              REÇU N° ${orderData.orderNumber || orderData.number}
            </div>
            
            <div style="font-size: 7pt; margin-bottom: 3mm;">
              Date: ${new Date(orderData.dateCreated).toLocaleDateString('fr-FR')}<br />
              Client: ${orderData.customer?.name || 'Customer'}<br />
              Tel: ${orderData.customer?.phone || 'N/A'}
            </div>
            
            <div class="divider"></div>
            
            <div class="items">
              ${orderData.items
                .map((item: OrderItem): string => {
                  // Use OrderItem fields - price, quantity, total
                  const price: number = Number(item.price || 0);
                  const quantity: number = Number(item.quantity || 1);
                  const total: number = Number(item.total || (price * quantity));
                  const productName: string = item.product?.name || 'Product';
                  const formattedPrice = this.formatCurrency(price);
                  const formattedTotal = this.formatCurrency(total);
                  return `
                  <div class="item">
                    <div style="font-weight: bold;">${productName}</div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>${quantity} x ${formattedPrice}</span>
                      <span>${formattedTotal} DH</span>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
            
            <div class="totals">
              <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 1mm; margin-top: 1mm;">
                <span>Total:</span>
                <span>${this.formatCurrency((orderData.total || 0) * 1.2)} DH</span>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <div style="text-align: center; font-size: 6pt; margin-top: 3mm;">
              Merci pour votre commande!<br />
              Système ORDERIUM
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
