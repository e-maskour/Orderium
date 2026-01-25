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
  status: 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
  confirmedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  assignedAt?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}
