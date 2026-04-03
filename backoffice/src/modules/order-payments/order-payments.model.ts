import {
  IOrderPayment,
  OrderPaymentType,
  ORDER_PAYMENT_TYPE_LABELS,
} from './order-payments.interface';

export class OrderPayment implements IOrderPayment {
  id: number;
  orderId: number;
  customerId?: number | null;
  amount: number;
  paymentDate: string;
  paymentType: OrderPaymentType;
  notes?: string | null;
  referenceNumber?: string | null;
  dateCreated: string;
  dateUpdated: string;
  orderNumber?: string | null;
  customerName?: string | null;

  constructor(data: IOrderPayment) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.customerId = data.customerId;
    this.amount = data.amount;
    this.paymentDate = data.paymentDate;
    this.paymentType = data.paymentType;
    this.notes = data.notes;
    this.referenceNumber = data.referenceNumber;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.orderNumber = data.orderNumber ?? null;
    this.customerName = data.customerName ?? null;
  }

  get displayAmount(): string {
    return this.amount.toFixed(2);
  }

  get displayPaymentType(): string {
    return ORDER_PAYMENT_TYPE_LABELS[this.paymentType] ?? this.paymentType;
  }

  get displayDate(): string {
    return new Date(this.paymentDate).toLocaleDateString();
  }

  static fromApiResponse(data: any): OrderPayment {
    return new OrderPayment({
      id: data.id,
      orderId: data.orderId,
      customerId: data.customerId ?? null,
      amount: data.amount ?? 0,
      paymentDate: data.paymentDate,
      paymentType: data.paymentType,
      notes: data.notes ?? null,
      referenceNumber: data.referenceNumber ?? null,
      dateCreated: data.dateCreated || data.date_created,
      dateUpdated: data.dateUpdated || data.date_updated,
      orderNumber: data.order?.documentNumber ?? data.orderNumber ?? null,
      customerName: data.order?.customerName ?? data.customerName ?? data.customer?.name ?? null,
    });
  }
}
