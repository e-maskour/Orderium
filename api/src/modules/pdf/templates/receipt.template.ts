/* eslint-disable prettier/prettier */

interface ReceiptTemplateData {
  documentNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  itemsHtml: string;
  subtotal: string;
  discount?: string;
  discountType?: number;
  tax: string;
  total: string;
  hideVAT?: boolean;
  companyName: string;
  companyLines: string[];
}

export function renderReceiptTemplate(data: ReceiptTemplateData): string {
  // Build discount row if it exists
  const discountRowHtml = data.discount && data.discount !== '0.00'
    ? `<div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
         <span>Remise${data.discountType === 1 ? ' (%)' : ''}:</span>
         <span>-${data.discount}${data.discountType === 1 ? '%' : ' DH'}</span>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reçu ${data.documentNumber}</title>
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
    <!-- Header -->
    <div class="header">
      <div style="font-size: 12pt;">${data.companyName}</div>
      ${data.companyLines.map(line => `<div style="font-size: 7pt;">${line}</div>`).join('')}
    </div>
    
    <div class="divider"></div>
    
    <!-- Receipt Info -->
    <div style="font-weight: bold; margin: 2mm 0;">
      REÇU N° ${data.documentNumber}
    </div>
    <div style="font-size: 7pt; margin-bottom: 3mm;">
      Date: ${data.date}<br />
      Client: ${data.customerName}<br />
      ${data.customerPhone ? `Tel: ${data.customerPhone}<br />` : ''}
    </div>
    
    <div class="divider"></div>
    
    <!-- Items -->
    <div class="items">
      ${data.itemsHtml}
    </div>
    
    <!-- Totals -->
    <div class="totals">
      ${!data.hideVAT ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
        <span>Sous-total:</span>
        <span>${data.subtotal} DH</span>
      </div>
      ${discountRowHtml}
      <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
        <span>TVA (20%):</span>
        <span>${data.tax} DH</span>
      </div>
      ` : `
      ${discountRowHtml}
      `}
      <div style="display: flex; justify-content: space-between; font-weight: bold; ${!data.hideVAT ? 'border-top: 1px solid #000; padding-top: 1mm; margin-top: 1mm;' : ''}">
        <span>Total:</span>
        <span>${data.total} DH</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <!-- Footer -->
    <div style="text-align: center; font-size: 6pt; margin-top: 3mm;">
      Merci pour votre commande!
    </div>
  </div>
</body>
</html>
  `;
}
