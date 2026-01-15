export interface Order {
  id: number;
  orderNumber?: string;
  customerId?: number;
  status?: string;
  totalAmount?: number;
  deliveryPersonId?: number | null;
  deliveryPersonName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderAssignment {
  orderId: number;
  deliveryPersonId: number;
}
