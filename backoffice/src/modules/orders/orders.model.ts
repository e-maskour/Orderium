import { Order as IOrder } from './orders.interface';

export class Order implements IOrder {
  id: number;
  orderNumber?: string;
  customerId?: number;
  status?: string;
  totalAmount?: number;
  deliveryPersonId?: number | null;
  deliveryPersonName?: string | null;
  createdAt: string;
  updatedAt?: string;

  constructor(data: IOrder) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.customerId = data.customerId;
    this.status = data.status;
    this.totalAmount = data.totalAmount;
    this.deliveryPersonId = data.deliveryPersonId;
    this.deliveryPersonName = data.deliveryPersonName;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
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
    return new Order({
      id: data.id,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      status: data.status,
      totalAmount: data.totalAmount ? parseFloat(data.totalAmount) : undefined,
      deliveryPersonId: data.deliveryPersonId,
      deliveryPersonName: data.deliveryPersonName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Convert to plain object
  toJSON(): IOrder {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      status: this.status,
      totalAmount: this.totalAmount,
      deliveryPersonId: this.deliveryPersonId,
      deliveryPersonName: this.deliveryPersonName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
