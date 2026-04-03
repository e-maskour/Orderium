import { DeliveryStatus } from '../orders/entities/order.entity';

/**
 * Applies the status-specific timestamp to any entity that carries
 * delivery timeline fields (Order, OrderDelivery both use the same field names).
 */
export function applyDeliveryStatusTimestamp(
  entity: Record<string, unknown>,
  status: DeliveryStatus,
  now: Date,
): void {
  const map: Partial<Record<DeliveryStatus, string>> = {
    [DeliveryStatus.PENDING]: 'pendingAt',
    [DeliveryStatus.ASSIGNED]: 'assignedAt',
    [DeliveryStatus.CONFIRMED]: 'confirmedAt',
    [DeliveryStatus.PICKED_UP]: 'pickedUpAt',
    [DeliveryStatus.TO_DELIVERY]: 'toDeliveryAt',
    [DeliveryStatus.IN_DELIVERY]: 'inDeliveryAt',
    [DeliveryStatus.DELIVERED]: 'deliveredAt',
    [DeliveryStatus.CANCELED]: 'canceledAt',
  };
  const field = map[status];
  if (field) entity[field] = now;
}
