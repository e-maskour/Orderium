export interface Order {
  OrderId: number;
  OrderNumber: string;
  CustomerName: string;
  CustomerPhone: string;
  CustomerAddress?: string;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
  TotalAmount: number;
  Status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  ConfirmedAt?: string;
  PickedUpAt?: string;
  DeliveredAt?: string;
  CreatedAt: string;
  AssignedAt?: string;
  Items?: OrderItem[];
}

export interface OrderItem {
  ProductName: string;
  Quantity: number;
  Price: number;
}
