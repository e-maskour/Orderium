import { ApiProperty } from '@nestjs/swagger';
import { OrderDelivery } from '../entities/delivery.entity';
import { Partner } from '../../partners/entities/partner.entity';

export class DeliveryOrderResponseDto {
  @ApiProperty() orderId: number;
  @ApiProperty() orderNumber: string;
  @ApiProperty() customerName: string;
  @ApiProperty({ required: false }) customerPhone?: string;
  @ApiProperty({ required: false }) customerAddress?: string;
  @ApiProperty({ required: false }) latitude?: number;
  @ApiProperty({ required: false }) longitude?: number;
  @ApiProperty({ required: false }) googleMapsUrl?: string;
  @ApiProperty({ required: false }) wazeUrl?: string;
  @ApiProperty() totalAmount: number;
  @ApiProperty() status: string;
  @ApiProperty({ required: false }) pendingAt?: string;
  @ApiProperty({ required: false }) assignedAt?: string;
  @ApiProperty({ required: false }) confirmedAt?: string;
  @ApiProperty({ required: false }) pickedUpAt?: string;
  @ApiProperty({ required: false }) toDeliveryAt?: string;
  @ApiProperty({ required: false }) inDeliveryAt?: string;
  @ApiProperty({ required: false }) deliveredAt?: string;
  @ApiProperty({ required: false }) canceledAt?: string;
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) items?: {
    productName: string;
    quantity: number;
    price: number;
  }[];

  static fromOrderDelivery(od: OrderDelivery): DeliveryOrderResponseDto {
    const customer = od.order?.customer as Partner | undefined;
    return {
      orderId: od.order.id,
      orderNumber: od.order.orderNumber ?? od.order.documentNumber,
      customerName: customer?.name ?? 'N/A',
      customerPhone: customer?.phoneNumber ?? 'N/A',
      customerAddress: (customer as any)?.deliveryAddress ?? customer?.address,
      latitude: (customer as any)?.latitude,
      longitude: (customer as any)?.longitude,
      googleMapsUrl: (customer as any)?.googleMapsUrl,
      wazeUrl:
        (customer as any)?.wazeUrl ??
        ((customer as any)?.latitude && (customer as any)?.longitude
          ? `https://waze.com/ul?ll=${(customer as any).latitude},${(customer as any).longitude}&navigate=yes`
          : undefined),
      totalAmount: Number(od.order.total),
      status: od.status,
      pendingAt: od.pendingAt?.toISOString(),
      assignedAt: od.assignedAt?.toISOString(),
      confirmedAt: od.confirmedAt?.toISOString(),
      pickedUpAt: od.pickedUpAt?.toISOString(),
      toDeliveryAt: od.toDeliveryAt?.toISOString(),
      inDeliveryAt: od.inDeliveryAt?.toISOString(),
      deliveredAt: od.deliveredAt?.toISOString(),
      canceledAt: od.canceledAt?.toISOString(),
      createdAt: od.order.dateCreated?.toISOString(),
      items: od.order.items?.map((item) => ({
        productName: (item as any).product?.name ?? 'Unknown Product',
        quantity: Number((item as any).quantity),
        price: Number((item as any).unitPrice),
      })),
    };
  }
}
