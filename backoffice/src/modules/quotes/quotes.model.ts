import {
  IQuote,
  IQuoteItem,
  IQuoteWithDetails
} from './quotes.interface';

export class QuoteItem implements IQuoteItem {
  id: number;
  quoteId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;

  constructor(data: IQuoteItem) {
    this.id = data.id;
    this.quoteId = data.quoteId;
    this.productId = data.productId;
    this.description = data.description;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.tax = data.tax;
    this.total = data.total;
  }

  get subtotal(): number {
    return this.quantity * this.unitPrice;
  }

  get discountAmount(): number {
    if (this.discountType === 1) {
      return this.subtotal * (this.discount / 100);
    }
    return this.discount;
  }

  get subtotalAfterDiscount(): number {
    return this.subtotal - this.discountAmount;
  }

  get displayUnitPrice(): string {
    return this.unitPrice.toFixed(2);
  }

  get displayTotal(): string {
    return this.total.toFixed(2);
  }

  static fromApiResponse(data: any): QuoteItem {
    return new QuoteItem({
      id: data.id,
      quoteId: data.quoteId,
      productId: data.productId,
      description: data.description,
      quantity: parseFloat(data.quantity) || 0,
      unitPrice: parseFloat(data.unitPrice) || 0,
      discount: parseFloat(data.discount) || 0,
      discountType: data.discountType || 0,
      tax: parseFloat(data.tax) || 0,
      total: parseFloat(data.total) || 0,
    });
  }

  toJSON(): IQuoteItem {
    return {
      id: this.id,
      quoteId: this.quoteId,
      productId: this.productId,
      description: this.description,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      discount: this.discount,
      discountType: this.discountType,
      tax: this.tax,
      total: this.total,
    };
  }
}

export class Quote implements IQuote {
  id: number;
  quoteNumber: string;
  direction: 'ACHAT' | 'VENTE';
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  date: string;
  expirationDate?: string | null;
  dueDate?: string | null;
  validationDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  status: 'draft' | 'open' | 'signed' | 'closed' | 'delivered' | 'invoiced';
  isValidated: boolean;
  notes?: string | null;
  clientNotes?: string | null;
  signedBy?: string | null;
  signedDate?: string | null;
  shareToken?: string | null;
  shareTokenExpiry?: string | null;
  convertedToInvoiceId?: number | null;
  convertedToOrderId?: number | null;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IQuote) {
    this.id = data.id;
    this.quoteNumber = data.quoteNumber;
    this.direction = data.direction;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.customerPhone = data.customerPhone;
    this.customerAddress = data.customerAddress;
    this.supplierId = data.supplierId;
    this.supplierName = data.supplierName;
    this.supplierPhone = data.supplierPhone;
    this.supplierAddress = data.supplierAddress;
    this.date = data.date;
    this.expirationDate = data.expirationDate;
    this.dueDate = data.dueDate;
    this.validationDate = data.validationDate;
    this.subtotal = data.subtotal;
    this.tax = data.tax;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.total = data.total;
    this.status = data.status;
    this.isValidated = data.isValidated;
    this.notes = data.notes;
    this.clientNotes = data.clientNotes;
    this.signedBy = data.signedBy;
    this.signedDate = data.signedDate;
    this.shareToken = data.shareToken;
    this.shareTokenExpiry = data.shareTokenExpiry;
    this.convertedToInvoiceId = data.convertedToInvoiceId;
    this.convertedToOrderId = data.convertedToOrderId;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  get partnerName(): string {
    return this.customerName || this.supplierName || 'N/A';
  }

  get partnerPhone(): string {
    return this.customerPhone || this.supplierPhone || 'N/A';
  }

  get partnerAddress(): string {
    return this.customerAddress || this.supplierAddress || 'N/A';
  }

  get isDraft(): boolean {
    return this.status === 'draft';
  }

  get isOpen(): boolean {
    return this.status === 'open';
  }

  get isSigned(): boolean {
    return this.status === 'signed';
  }

  get isClosed(): boolean {
    return this.status === 'closed';
  }

  get isInvoiced(): boolean {
    return this.status === 'invoiced';
  }

  get isDelivered(): boolean {
    return this.status === 'delivered';
  }

  get isExpired(): boolean {
    if (!this.expirationDate || this.isClosed || this.isInvoiced) return false;
    return new Date(this.expirationDate) < new Date();
  }

  get canBeShared(): boolean {
    return !!this.shareToken;
  }

  get isConverted(): boolean {
    return !!(this.convertedToInvoiceId || this.convertedToOrderId);
  }

  get displaySubtotal(): string {
    return this.subtotal.toFixed(2);
  }

  get displayTax(): string {
    return this.tax.toFixed(2);
  }

  get displayDiscount(): string {
    return this.discount.toFixed(2);
  }

  get displayTotal(): string {
    return this.total.toFixed(2);
  }

  get discountAmount(): number {
    if (this.discountType === 1) {
      return this.subtotal * (this.discount / 100);
    }
    return this.discount;
  }

  get taxAmount(): number {
    const subtotalAfterDiscount = this.subtotal - this.discountAmount;
    return subtotalAfterDiscount * (this.tax / 100);
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'draft': return 'Brouillon';
      case 'open': return 'Ouvert';
      case 'signed': return 'Signée';
      case 'closed': return 'Fermée';
      case 'delivered': return 'À livrer';
      case 'invoiced': return 'Facturée';
      default: return 'Inconnu';
    }
  }

  static fromApiResponse(data: any): Quote {
    return new Quote({
      id: data.id,
      quoteNumber: data.quoteNumber || data.documentNumber,
      direction: data.direction || (data.supplierId ? 'ACHAT' : 'VENTE'),
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      supplierPhone: data.supplierPhone,
      supplierAddress: data.supplierAddress,
      date: data.date,
      expirationDate: data.expirationDate,
      dueDate: data.dueDate,
      validationDate: data.validationDate,
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      discount: parseFloat(data.discount) || 0,
      discountType: data.discountType || 0,
      total: parseFloat(data.total) || 0,
      status: data.status || 'draft',
      isValidated: data.isValidated || false,
      notes: data.notes,
      clientNotes: data.clientNotes,
      signedBy: data.signedBy,
      signedDate: data.signedDate,
      shareToken: data.shareToken,
      shareTokenExpiry: data.shareTokenExpiry,
      convertedToInvoiceId: data.convertedToInvoiceId,
      convertedToOrderId: data.convertedToOrderId,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  toJSON(): IQuote {
    return {
      id: this.id,
      quoteNumber: this.quoteNumber,
      direction: this.direction,
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerAddress: this.customerAddress,
      supplierId: this.supplierId,
      supplierName: this.supplierName,
      supplierPhone: this.supplierPhone,
      supplierAddress: this.supplierAddress,
      date: this.date,
      expirationDate: this.expirationDate,
      dueDate: this.dueDate,
      validationDate: this.validationDate,
      subtotal: this.subtotal,
      tax: this.tax,
      discount: this.discount,
      discountType: this.discountType,
      total: this.total,
      status: this.status,
      isValidated: this.isValidated,
      notes: this.notes,
      clientNotes: this.clientNotes,
      signedBy: this.signedBy,
      signedDate: this.signedDate,
      shareToken: this.shareToken,
      shareTokenExpiry: this.shareTokenExpiry,
      convertedToInvoiceId: this.convertedToInvoiceId,
      convertedToOrderId: this.convertedToOrderId,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}

export class QuoteWithDetails implements IQuoteWithDetails {
  quote: Quote;
  items: QuoteItem[];

  constructor(data: IQuoteWithDetails) {
    this.quote = data.quote instanceof Quote ? data.quote : new Quote(data.quote);
    this.items = data.items.map(item => item instanceof QuoteItem ? item : new QuoteItem(item));
  }

  get totalItems(): number {
    return this.items.length;
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  canBeEdited(): boolean {
    return this.quote.isDraft;
  }

  static fromApiResponse(data: any): QuoteWithDetails {
    const quoteData = data.quote || data;
    return new QuoteWithDetails({
      quote: Quote.fromApiResponse(quoteData),
      items: (quoteData.items || []).map(QuoteItem.fromApiResponse),
    });
  }

  toJSON(): IQuoteWithDetails {
    return {
      quote: this.quote.toJSON(),
      items: this.items.map((i) => i.toJSON()),
    };
  }
}
