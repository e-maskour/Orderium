export interface Order {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
  totalAmount: number;
  status?: string; // Main order status
  deliveryStatus: 'pending' | 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
  pendingAt?: string;
  assignedAt?: string;
  confirmedAt?: string;
  pickedUpAt?: string;
  toDeliveryAt?: string;
  inDeliveryAt?: string;
  deliveredAt?: string;
  canceledAt?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}
