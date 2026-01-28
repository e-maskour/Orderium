/* eslint-disable prettier/prettier */

interface ReceiptTemplateData {
  documentNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  itemsHtml: string;
  subtotal: string;
  tax: string;
  total: string;
}

export function renderReceiptTemplate(data: ReceiptTemplateData): string {
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
      <div style="font-size: 12pt;">ORDERIUM</div>
      <div style="font-size: 7pt;">123 Avenue Mohammed V</div>
      <div style="font-size: 7pt;">Casablanca 20000, Maroc</div>
      <div style="font-size: 7pt;">Tel: +212 5XX-XXXXXX</div>
    </div>
    
    <div class="divider"></div>
    
    <!-- Receipt Info -->
    <div style="text-align: center; font-weight: bold; margin: 2mm 0;">
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
      <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
        <span>Sous-total:</span>
        <span>${data.subtotal} DH</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
        <span>TVA (20%):</span>
        <span>${data.tax} DH</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 1mm; margin-top: 1mm;">
        <span>Total:</span>
        <span>${data.total} DH</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <!-- Footer -->
    <div style="text-align: center; font-size: 6pt; margin-top: 3mm;">
      Merci pour votre commande!<br />
      Système ORDERIUM
    </div>
  </div>
</body>
</html>
  `;
}
