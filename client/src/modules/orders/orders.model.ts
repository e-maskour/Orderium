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
    public total: number,
    public description?: string,
    public price?: number,
    public tax?: number,
  ) { }

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

  static fromApiResponse(data: Record<string, unknown>): OrderItem {
    return new OrderItem(
      data.id as number,
      data.orderId as number,
      data.productId as number,
      String(data.productName || data.description || `Product ${data.productId}`),
      (data.quantity as number) || 0,
      (data.unitPrice as number) || (data.price as number) || 0,
      (data.discount as number) || 0,
      (data.discountType as number) || 0,
      (data.taxAmount as number) || (data.tax as number) || 0,
      (data.total as number) || 0,
      data.description as string | undefined,
      (data.price as number) || undefined,
      (data.tax as number) || undefined,
    );
  }
}

export class Order implements IOrder {
  constructor(
    public id: number,
    public orderNumber: string | null,
    public documentNumber: string,
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
    public customerAddress?: string,
    public note?: string,
    public internalNote?: string,
    public date?: string,
    public isValidated?: boolean,
  ) { }

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

  static fromApiResponse(data: Record<string, unknown>): Order {
    const items = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[]).map((item) => OrderItem.fromApiResponse(item))
      : [];

    return new Order(
      data.id as number,
      (data.orderNumber as string | null) ?? null,
      (data.documentNumber as string) ?? (data.orderNumber as string) ?? '',
      data.customerId as number,
      items,
      (data.subtotal as number) || 0,
      (data.taxAmount as number) || 0,
      (data.discountAmount as number) || 0,
      (data.total as number) || 0,
      data.status as string,
      data.dateCreated as string,
      data.dateUpdated as string,
      data.customerName as string | undefined,
      data.customerPhone as string | undefined,
      data.customerAddress as string | undefined,
      data.note as string | undefined,
      data.internalNote as string | undefined,
      data.date as string | undefined,
      data.isValidated as boolean | undefined,
    );
  }

  toJSON(): IOrder {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      documentNumber: this.documentNumber,
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerAddress: this.customerAddress,
      items: this.items.map((item) => ({
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
      date: this.date,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      isValidated: this.isValidated,
    };
  }
}
