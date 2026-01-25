import { Order as IOrder } from './orders.interface';

export class Order implements IOrder {
  id: number;
  orderNumber?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  status?: string;
  totalAmount?: number;
  deliveryPersonId?: number | null;
  deliveryPersonName?: string | null;
  createdAt: string;
  updatedAt?: string;
  date?: string;
  note?: string;
  discount?: number;
  serviceType?: number;
  items?: any[];

  constructor(data: IOrder) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.customerPhone = data.customerPhone;
    this.customerAddress = data.customerAddress;
    this.status = data.status;
    this.totalAmount = data.totalAmount;
    this.deliveryPersonId = data.deliveryPersonId;
    this.deliveryPersonName = data.deliveryPersonName;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.date = data.date;
    this.note = data.note;
    this.discount = data.discount;
    this.serviceType = data.serviceType;
    this.items = data.items;
  }

  // Getters
  get hasDeliveryPerson(): boolean {
    return this.deliveryPersonId !== null && this.deliveryPersonId !== undefined;
  }

  get isAssigned(): boolean {
    return this.hasDeliveryPerson;
  }

  get displayTotal(): string {
    return this.totalAmount ? this.totalAmount.toFixed(2) : '0.00';
  }

  get statusText(): string {
    return this.status || 'Unknown';
  }

  get displayOrderNumber(): string {
    return this.orderNumber || `#${this.id}`;
  }

  get deliveryPersonDisplayName(): string {
    return this.deliveryPersonName || 'Unassigned';
  }

  // Status checks
  isPending(): boolean {
    return this.status === 'pending';
  }

  isProcessing(): boolean {
    return this.status === 'processing';
  }

  isDelivering(): boolean {
    return this.status === 'delivering';
  }

  isDelivered(): boolean {
    return this.status === 'delivered';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  // Methods
  canBeAssigned(): boolean {
    return !this.isDelivered() && !this.isCancelled();
  }

  canBeUnassigned(): boolean {
    return this.hasDeliveryPerson && !this.isDelivered() && !this.isCancelled();
  }

  canBeCancelled(): boolean {
    return !this.isDelivered() && !this.isCancelled();
  }

  // Static factory method
  static fromApiResponse(data: any): Order {
    // Handle flat structure (unified API response)
    return new Order({
      id: data.id,
      orderNumber: data.number || data.orderNumber,
      customerId: data.customerId,
      customerName: data.customer?.name || data.customerName,
      customerPhone: data.customer?.phoneNumber || data.customerPhone,
      customerAddress: data.customer?.address || data.customerAddress,
      status: data.status,
      totalAmount: data.total ? parseFloat(data.total) : undefined,
      deliveryPersonId: data.deliveryPersonId,
      deliveryPersonName: data.deliveryPersonName,
      createdAt: data.dateCreated,
      updatedAt: data.dateUpdated,
      date: data.date || data.dateCreated,
      note: data.note || data.internalNote,
      discount: data.discount ? parseFloat(data.discount) : 0,
      serviceType: data.serviceType,
      items: data.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        quantity: item.quantity,
        price: parseFloat(item.price || 0),
        discount: parseFloat(item.discount || 0),
        total: parseFloat(item.total || 0),
      })) || [],
    });
  }

  // Convert to plain object
  toJSON(): IOrder {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerAddress: this.customerAddress,
      status: this.status,
      totalAmount: this.totalAmount,
      deliveryPersonId: this.deliveryPersonId,
      deliveryPersonName: this.deliveryPersonName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      date: this.date,
      note: this.note,
      discount: this.discount,
      serviceType: this.serviceType,
      items: this.items,
    };
  }
}
