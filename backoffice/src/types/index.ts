export interface DeliveryPerson {
  Id: number;
  Name: string;
  PhoneNumber: string;
  Email?: string;
  IsActive: boolean;
  DateCreated: string;
  DateUpdated?: string;
}

export interface Order {
  OrderId: number;
  OrderNumber: string;
  CustomerName: string;
  CustomerPhone: string;
  CustomerAddress?: string;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
  TotalAmount: number;
  Status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  DeliveryPersonId?: number;
  ConfirmedAt?: string;
  PickedUpAt?: string;
  DeliveredAt?: string;
  CreatedAt: string;
  AssignedAt?: string;
}

export interface OrderDelivery {
  Id: number;
  DocumentId: number;
  CustomerId: number;
  DeliveryId: number;
  Status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  DateCreated: string;
}
