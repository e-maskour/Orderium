export interface DeliveryPerson {
  Id: number;
  Name: string;
  PhoneNumber: string;
  Email?: string;
  IsActive: boolean;
  DateCreated: Date;
  DateUpdated: Date;
}

export interface OrderDelivery {
  Id: number;
  DocumentId: number;
  CustomerId: number;
  DeliveryId: number;
  Status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
  ConfirmedAt?: Date;
  PickedUpAt?: Date;
  DeliveredAt?: Date;
  DateCreated: Date;
  DateUpdated: Date;
}

export interface CreateOrderDeliveryDTO {
  DocumentId: number;
  CustomerId: number;
  DeliveryId: number;
}

export interface UpdateOrderDeliveryStatusDTO {
  Status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
}

export interface CreateDeliveryPersonDTO {
  Name: string;
  PhoneNumber: string;
  Email?: string;
  Password: string;
}

export interface UpdateDeliveryPersonDTO {
  Name?: string;
  Email?: string;
  IsActive?: boolean;
}

export interface DeliveryLoginDTO {
  PhoneNumber: string;
  Password: string;
}

export interface DeliveryOrderItem {
  ProductName: string;
  Quantity: number;
  Price: number;
}

export interface DeliveryOrder {
  OrderId: number;
  OrderNumber: string;
  CustomerName: string;
  CustomerPhone: string;
  CustomerAddress: string;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
  TotalAmount: number;
  Status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled' | null;
  ConfirmedAt?: Date;
  PickedUpAt?: Date;
  DeliveredAt?: Date;
  CreatedAt: Date;
  AssignedAt?: Date;
  Items: DeliveryOrderItem[];
  DeliveryPersonId?: number;
}
