import {
  Invoice as IInvoice,
  InvoiceItem as IInvoiceItem,
  InvoiceCustomer as IInvoiceCustomer,
  InvoiceWithDetails as IInvoiceWithDetails,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  RecordPaymentDTO
} from './invoices.interface';

export class InvoiceCustomer implements IInvoiceCustomer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;

  constructor(data: IInvoiceCustomer) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.address = data.address;
    this.city = data.city;
  }

  get displayName(): string {
    return this.name;
  }

  static fromApiResponse(data: any): InvoiceCustomer | undefined {
    if (!data) return undefined;
    return new InvoiceCustomer({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
    });
  }
}

export class InvoiceItem implements IInvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number | null;
  productName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: string;
  taxRate: number;
  total: number;

  constructor(data: IInvoiceItem) {
    this.id = data.id;
    this.invoiceId = data.invoiceId;
    this.productId = data.productId;
    this.productName = data.productName;
    this.description = data.description;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.taxRate = data.taxRate;
    this.total = data.total;
  }

  // Getters
  get subtotal(): number {
    return this.quantity * this.unitPrice;
  }

  get discountAmount(): number {
    if (this.discountType === 'percentage') {
      return this.subtotal * (this.discount / 100);
    }
    return this.discount;
  }

  get subtotalAfterDiscount(): number {
    return this.subtotal - this.discountAmount;
  }

  get taxAmount(): number {
    return this.subtotalAfterDiscount * (this.taxRate / 100);
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
      productName: data.productName,
      description: data.description,
      quantity: parseFloat(data.quantity) || 0,
      unitPrice: parseFloat(data.unitPrice) || 0,
      discount: parseFloat(data.discount) || 0,
      discountType: data.discountType,
      taxRate: parseFloat(data.taxRate) || 0,
      total: parseFloat(data.total) || 0,
    });
  }
}

export class Invoice implements IInvoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  adminId?: number | null;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  note?: string | null;
  terms?: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(data: IInvoice) {
    this.id = data.id;
    this.invoiceNumber = data.invoiceNumber;
    this.customerId = data.customerId;
    this.adminId = data.adminId;
    this.date = data.date;
    this.dueDate = data.dueDate;
    this.subtotal = data.subtotal;
    this.taxAmount = data.taxAmount;
    this.discountAmount = data.discountAmount;
    this.total = data.total;
    this.paidAmount = data.paidAmount;
    this.status = data.status;
    this.paymentStatus = data.paymentStatus;
    this.note = data.note;
    this.terms = data.terms;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Getters
  get remainingAmount(): number {
    return this.total - this.paidAmount;
  }

  get isPaid(): boolean {
    return this.paidAmount >= this.total;
  }

  get isPartiallyPaid(): boolean {
    return this.paidAmount > 0 && this.paidAmount < this.total;
  }

  get isUnpaid(): boolean {
    return this.paidAmount === 0;
  }

  get isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date(this.dueDate) < new Date() && !this.isPaid;
  }

  get displaySubtotal(): string {
    return this.subtotal.toFixed(2);
  }

  get displayTaxAmount(): string {
    return this.taxAmount.toFixed(2);
  }

  get displayDiscountAmount(): string {
    return this.discountAmount.toFixed(2);
  }

  get displayTotal(): string {
    return this.total.toFixed(2);
  }

  get displayPaidAmount(): string {
    return this.paidAmount.toFixed(2);
  }

  get displayRemainingAmount(): string {
    return this.remainingAmount.toFixed(2);
  }

  get statusBadgeColor(): string {
    switch (this.paymentStatus.toLowerCase()) {
      case 'paid': return 'green';
      case 'partial': return 'yellow';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  }

  // Static factory method
  static fromApiResponse(data: any): Invoice {
    return new Invoice({
      id: data.id,
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      adminId: data.adminId,
      date: data.date,
      dueDate: data.dueDate,
      subtotal: parseFloat(data.subtotal) || 0,
      taxAmount: parseFloat(data.taxAmount) || 0,
      discountAmount: parseFloat(data.discountAmount) || 0,
      total: parseFloat(data.total) || 0,
      paidAmount: parseFloat(data.paidAmount) || 0,
      status: data.status,
      paymentStatus: data.paymentStatus,
      note: data.note,
      terms: data.terms,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

export class InvoiceWithDetails implements IInvoiceWithDetails {
  invoice: Invoice;
  items: InvoiceItem[];
  customer?: InvoiceCustomer;

  constructor(data: IInvoiceWithDetails) {
    this.invoice = data.invoice instanceof Invoice ? data.invoice : new Invoice(data.invoice);
    this.items = data.items.map(item => item instanceof InvoiceItem ? item : new InvoiceItem(item));
    this.customer = data.customer instanceof InvoiceCustomer ? data.customer : (data.customer ? new InvoiceCustomer(data.customer) : undefined);
  }

  // Getters
  get totalItems(): number {
    return this.items.length;
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get hasCustomer(): boolean {
    return !!this.customer;
  }

  // Methods
  canBePaid(): boolean {
    return !this.invoice.isPaid;
  }

  canBeEdited(): boolean {
    return this.invoice.status !== 'cancelled' && this.invoice.status !== 'void';
  }

  // Static factory method
  static fromApiResponse(data: any): InvoiceWithDetails {
    const invoiceData = data.invoice || data;
    return new InvoiceWithDetails({
      invoice: Invoice.fromApiResponse(invoiceData),
      items: (data.items || []).map(InvoiceItem.fromApiResponse),
      customer: InvoiceCustomer.fromApiResponse(data.customer),
    });
  }
}
