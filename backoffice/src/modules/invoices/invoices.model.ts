import {
  Invoice as IInvoice,
  InvoiceItem as IInvoiceItem,
  InvoiceWithDetails as IInvoiceWithDetails
} from './invoices.interface';

export class InvoiceItem implements IInvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;

  constructor(data: IInvoiceItem) {
    this.id = data.id;
    this.invoiceId = data.invoiceId;
    this.productId = data.productId;
    this.description = data.description;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.tax = data.tax;
    this.total = data.total;
  }

  // Getters
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

  // Static factory method
  static fromApiResponse(data: any): InvoiceItem {
    return new InvoiceItem({
      id: data.id,
      invoiceId: data.invoiceId,
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
}

export class Invoice implements IInvoice {
  id: number;
  invoiceNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  date: string;
  dueDate?: string | null;
  validationDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'unpaid' | 'partial' | 'paid';
  isValidated: boolean;
  notes?: string | null;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IInvoice) {
    this.id = data.id;
    this.invoiceNumber = data.invoiceNumber;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.customerPhone = data.customerPhone;
    this.customerAddress = data.customerAddress;
    this.supplierId = data.supplierId;
    this.supplierName = data.supplierName;
    this.supplierPhone = data.supplierPhone;
    this.supplierAddress = data.supplierAddress;
    this.date = data.date;
    this.dueDate = data.dueDate;
    this.validationDate = data.validationDate;
    this.subtotal = data.subtotal;
    this.tax = data.tax;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.total = data.total;
    this.paidAmount = data.paidAmount;
    this.remainingAmount = data.remainingAmount;
    this.status = data.status;
    this.isValidated = data.isValidated;
    this.notes = data.notes;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get isVente(): boolean {
    return !!this.customerId;
  }

  get isAchat(): boolean {
    return !!this.supplierId;
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

  get isPaid(): boolean {
    return this.status === 'paid';
  }

  get isPending(): boolean {
    return this.status === 'partial';
  }

  get isUnpaid(): boolean {
    return this.status === 'unpaid';
  }

  get isDraft(): boolean {
    return this.status === 'draft';
  }

  get isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date(this.dueDate) < new Date() && !this.isPaid;
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

  get statusBadgeColor(): string {
    if (this.isPaid) return 'green';
    if (this.isOverdue) return 'red';
    if (this.isPending) return 'amber';
    return 'gray';
  }

  get statusLabel(): string {
    if (this.isDraft) return 'Brouillon';
    if (this.isPaid) return 'Payée';
    if (this.isOverdue) return 'En retard';
    if (this.isPending) return 'Partielle';
    return 'Impayée';
  }

  // Static factory method
  static fromApiResponse(data: any): Invoice {
    return new Invoice({
      id: data.id,
      invoiceNumber: data.invoiceNumber || data.documentNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      supplierPhone: data.supplierPhone,
      supplierAddress: data.supplierAddress,
      date: data.date,
      dueDate: data.dueDate,
      validationDate: data.validationDate,
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      discount: parseFloat(data.discount) || 0,
      discountType: data.discountType || 0,
      total: parseFloat(data.total) || 0,
      paidAmount: parseFloat(data.paidAmount) || 0,
      remainingAmount: parseFloat(data.remainingAmount) || 0,
      status: data.status || 'draft',
      isValidated: data.isValidated || false,
      notes: data.notes,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }
}

export class InvoiceWithDetails implements IInvoiceWithDetails {
  invoice: Invoice;
  items: InvoiceItem[];

  constructor(data: IInvoiceWithDetails) {
    this.invoice = data.invoice instanceof Invoice ? data.invoice : new Invoice(data.invoice);
    this.items = data.items.map(item => item instanceof InvoiceItem ? item : new InvoiceItem(item));
  }

  // Getters
  get totalItems(): number {
    return this.items.length;
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get isVente(): boolean {
    return this.invoice.isVente;
  }

  get isAchat(): boolean {
    return this.invoice.isAchat;
  }

  // Methods
  canBeEdited(): boolean {
    return !this.invoice.isPaid;
  }

  // Static factory method
  static fromApiResponse(data: any): InvoiceWithDetails {
    const invoiceData = data.invoice || data;
    return new InvoiceWithDetails({
      invoice: Invoice.fromApiResponse(invoiceData),
      items: (invoiceData.items || []).map(InvoiceItem.fromApiResponse),
    });
  }
}
