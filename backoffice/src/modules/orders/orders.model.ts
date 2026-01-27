import {
  Order as IOrder,
  OrderItem as IOrderItem,
  OrderStatus,
  OrderWithDetails as IOrderWithDetails
} from './orders.interface';

export class OrderItem implements IOrderItem {
  id: number;
  orderId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;

  constructor(data: IOrderItem) {
    this.id = data.id;
    this.orderId = data.orderId;
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

  static fromApiResponse(data: any): OrderItem {
    return new OrderItem({
      id: data.id,
      orderId: data.orderId,
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

export class Order implements IOrder {
  id: number;
  orderNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  status: OrderStatus;
  isValidated: boolean;
  notes?: string | null;
  convertedToInvoiceId?: number | null;
  fromPortal?: boolean;
  deliveryPersonId?: number | null;
  deliveryPersonName?: string | null;
  dateCreated: string;
  dateUpdated: string;
  items?: OrderItem[];

  constructor(data: IOrder) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.customerPhone = data.customerPhone;
    this.customerAddress = data.customerAddress;
    this.date = data.date;
    this.dueDate = data.dueDate;
    this.subtotal = data.subtotal;
    this.tax = data.tax;
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.total = data.total;
    this.status = data.status;
    this.isValidated = data.isValidated;
    this.notes = data.notes;
    this.convertedToInvoiceId = data.convertedToInvoiceId;
    this.fromPortal = data.fromPortal;
    this.deliveryPersonId = data.deliveryPersonId;
    this.deliveryPersonName = data.deliveryPersonName;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.items = data.items ? (data.items.map(item => item instanceof OrderItem ? item : new OrderItem(item))) : undefined;
  }

  // Getters
  get partnerName(): string {
    return this.customerName || 'N/A';
  }

  get partnerPhone(): string {
    return this.customerPhone || 'N/A';
  }

  get partnerAddress(): string {
    return this.customerAddress || 'N/A';
  }

  get hasDeliveryPerson(): boolean {
    return this.deliveryPersonId !== null && this.deliveryPersonId !== undefined;
  }

  get isAssigned(): boolean {
    return this.hasDeliveryPerson;
  }

  get displayTotal(): string {
    return this.total.toFixed(2);
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

  get statusText(): string {
    return this.status;
  }

  get displayOrderNumber(): string {
    return this.orderNumber || `#${this.id}`;
  }

  get deliveryPersonDisplayName(): string {
    return this.deliveryPersonName || 'Unassigned';
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
      case 'validated': return 'Validée';
      case 'in_progress': return 'En cours';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return 'Inconnu';
    }
  }

  // Status checks
  isDraft(): boolean {
    return this.status === 'draft';
  }

  isValidatedStatus(): boolean {
    return this.status === 'validated';
  }

  isInProgress(): boolean {
    return this.status === 'in_progress';
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
      orderNumber: data.orderNumber || data.documentNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      date: data.date,
      dueDate: data.dueDate,
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      discount: parseFloat(data.discount) || 0,
      discountType: data.discountType || 0,
      total: parseFloat(data.total) || 0,
      status: data.status || 'draft',
      isValidated: data.isValidated || false,
      notes: data.notes,
      convertedToInvoiceId: data.convertedToInvoiceId,
      fromPortal: data.fromPortal || false,
      deliveryPersonId: data.deliveryPersonId, // Business logic field
      deliveryPersonName: data.deliveryPersonName, // Business logic field
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
      items: (data.items || []).map(OrderItem.fromApiResponse),
    });
  }
}

export class OrderWithDetails implements IOrderWithDetails {
  order: Order;
  items: OrderItem[];

  constructor(data: IOrderWithDetails) {
    this.order = data.order instanceof Order ? data.order : new Order(data.order);
    this.items = data.items.map(item => item instanceof OrderItem ? item : new OrderItem(item));
  }

  get totalItems(): number {
    return this.items.length;
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  canBeEdited(): boolean {
    return this.order.isDraft();
  }

  static fromApiResponse(data: any): OrderWithDetails {
    const orderData = data.order || data;
    return new OrderWithDetails({
      order: Order.fromApiResponse(orderData),
      items: (orderData.items || []).map(OrderItem.fromApiResponse),
    });
  }
}
