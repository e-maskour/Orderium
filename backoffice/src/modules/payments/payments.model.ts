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

  static fromApiResponse(data: any): Payment {
    return new Payment(data);
  }
}
