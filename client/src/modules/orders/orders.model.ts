import { Order as IOrder, OrderItem as IOrderItem } from './orders.interface';

export class OrderItem implements IOrderItem {
  constructor(
    public id: number,
    public orderId: number,
    public productId: number,
    public productName: string,
    public quantity: number,
    public unitPrice: number,
    public discount: number,
    public discountType: number,
    public taxAmount: number,
    public total: number
  ) {}

  get displayPrice(): string {
    return `$${this.unitPrice.toFixed(2)}`;
  }

  get displayTotal(): string {
    return `$${this.total.toFixed(2)}`;
  }

  get hasDiscount(): boolean {
    return this.discount > 0;
  }

  get discountPercentage(): number {
    if (this.discountType === 1) return this.discount;
    return (this.discount / this.unitPrice) * 100;
  }

  static fromApiResponse(data: any): OrderItem {
    return new OrderItem(
      data.id,
      data.orderId,
      data.productId,
      data.productName || `Product ${data.productId}`, // productName not in API entity
      parseFloat(data.quantity) || 0,
      parseFloat(data.unitPrice || data.price) || 0, // API uses 'price', client uses 'unitPrice'
      parseFloat(data.discount) || 0,
      data.discountType || 0,
      parseFloat(data.taxAmount) || 0, // May not exist in API
      parseFloat(data.total) || 0
    );
  }
}

export class Order implements IOrder {
  constructor(
    public id: number,
    public number: string,
    public customerId: number,
    public items: OrderItem[],
    public subtotal: number,
    public taxAmount: number,
    public discountAmount: number,
    public total: number,
    public status: string,
    public dateCreated: string,
    public dateUpdated: string,
    public customerName?: string,
    public customerPhone?: string,
    public note?: string,
    public internalNote?: string
  ) {}

  get displayTotal(): string {
    return `$${this.total.toFixed(2)}`;
  }

  get displaySubtotal(): string {
    return `$${this.subtotal.toFixed(2)}`;
  }

  get displayTaxAmount(): string {
    return `$${this.taxAmount.toFixed(2)}`;
  }

  get displayDiscountAmount(): string {
    return `$${this.discountAmount.toFixed(2)}`;
  }

  get itemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get hasDiscount(): boolean {
    return this.discountAmount > 0;
  }

  get statusText(): string {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      delivered: 'Delivered',
    };
    return statusMap[this.status?.toLowerCase()] || this.status;
  }

  isPending(): boolean {
    return this.status?.toLowerCase() === 'pending';
  }

  isProcessing(): boolean {
    return this.status?.toLowerCase() === 'processing';
  }

  isCompleted(): boolean {
    return this.status?.toLowerCase() === 'completed';
  }

  isDelivered(): boolean {
    return this.status?.toLowerCase() === 'delivered';
  }

  isCancelled(): boolean {
    return this.status?.toLowerCase() === 'cancelled';
  }

  canBeCancelled(): boolean {
    return this.isPending() || this.isProcessing();
  }

  static fromApiResponse(data: any): Order {
    const items = Array.isArray(data.items) 
      ? data.items.map((item: any) => OrderItem.fromApiResponse(item))
      : [];

    return new Order(
      data.id,
      data.number,
      data.customerId,
      items,
      parseFloat(data.subtotal) || 0,
      parseFloat(data.taxAmount) || 0,
      parseFloat(data.discountAmount) || 0,
      parseFloat(data.total) || 0,
      data.status,
      data.dateCreated,
      data.dateUpdated,
      data.customerName,
      data.customerPhone,
      data.note,
      data.internalNote
    );
  }

  toJSON(): IOrder {
    return {
      id: this.id,
      number: this.number,
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      items: this.items.map(item => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        taxAmount: item.taxAmount,
        total: item.total,
      })),
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      total: this.total,
      status: this.status,
      note: this.note,
      internalNote: this.internalNote,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
