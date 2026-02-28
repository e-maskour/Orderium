import { CreatePaymentDTO, UpdatePaymentDTO, PAYMENT_TYPE_LABELS } from './payments.interface';

export class Payment {
  id: number;
  invoiceId: number;
  customerId?: number;
  supplierId?: number;
  amount: number;
  paymentDate: string;
  paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
  notes?: string;
  referenceNumber?: string;
  createdAt: string;
  updatedAt: string;

  constructor(data: any) {
    this.id = data.id;
    this.invoiceId = data.invoiceId;
    this.customerId = data.customerId;
    this.supplierId = data.supplierId;
    this.amount = parseFloat(data.amount);
    this.paymentDate = data.paymentDate;
    this.paymentType = data.paymentType;
    this.notes = data.notes;
    this.referenceNumber = data.referenceNumber;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get displayAmount(): string {
    return this.amount.toFixed(2);
  }

  get displayPaymentType(): string {
    return PAYMENT_TYPE_LABELS[this.paymentType] ?? this.paymentType;
  }

  get displayDate(): string {
    return new Date(this.paymentDate).toLocaleDateString();
  }

  get isForCustomer(): boolean {
    return !!this.customerId;
  }

  get isForSupplier(): boolean {
    return !!this.supplierId;
  }

  get hasReference(): boolean {
    return !!this.referenceNumber;
  }

  get hasNotes(): boolean {
    return !!this.notes;
  }

  static fromApiResponse(data: any): Payment {
    return new Payment(data);
  }

  toUpdateDTO(): UpdatePaymentDTO {
    return {
      customerId: this.customerId,
      supplierId: this.supplierId,
      amount: this.amount,
      paymentDate: this.paymentDate,
      paymentType: this.paymentType,
      notes: this.notes,
      referenceNumber: this.referenceNumber,
    };
  }

  toCreateDTO(): CreatePaymentDTO {
    return {
      invoiceId: this.invoiceId,
      customerId: this.customerId,
      supplierId: this.supplierId,
      amount: this.amount,
      paymentDate: this.paymentDate,
      paymentType: this.paymentType,
      notes: this.notes,
      referenceNumber: this.referenceNumber,
    };
  }

  toJSON() {
    return {
      id: this.id,
      invoiceId: this.invoiceId,
      customerId: this.customerId,
      supplierId: this.supplierId,
      amount: this.amount,
      paymentDate: this.paymentDate,
      paymentType: this.paymentType,
      notes: this.notes,
      referenceNumber: this.referenceNumber,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
