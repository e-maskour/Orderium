export interface Order {
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
}

export interface OrderAssignment {
  orderId: number;
  deliveryPersonId: number;
}
