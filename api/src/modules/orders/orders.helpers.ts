/**
 * Pure helper functions for orders.
 * No database access, no injected services — input in, output out.
 */
import {
  Order,
  OrderItem,
  OrderStatus,
  DeliveryStatus,
} from './entities/order.entity';
import { DeliveryPerson } from '../delivery/entities/delivery.entity';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrderResponseDto {
  id: number;
  orderNumber: string | null; // CLIENT_POS / ADMIN_POS sequence (CMD-xxx)
  documentNumber: string; // BACKOFFICE delivery-note / purchase-order number
  receiptNumber: string | null; // POS receipt number
  date: Date;
  dueDate: Date | null;
  validationDate: Date | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  status: string;
  direction: string;
  isValidated: boolean;
  note: string;
  originType: string;
  deliveryStatus: string | null;
  pendingAt: Date | null;
  assignedAt: Date | null;
  confirmedAt: Date | null;
  pickedUpAt: Date | null;
  toDeliveryAt: Date | null;
  inDeliveryAt: Date | null;
  deliveredAt: Date | null;
  canceledAt: Date | null;
  dateCreated: Date;
  dateUpdated: Date;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  deliveryPersonId?: number | null;
  deliveryPersonName?: string | null;
  deliveryPersonPhone?: string | null;
  items: OrderItemResponseDto[];
}

export interface OrderItemResponseDto {
  id: number;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount: number;
  discountType: number;
  tax: number;
}

export interface DeliveryStatusCounts {
  all: number;
  pending: number;
  assigned: number;
  confirmed: number;
  picked_up: number;
  to_delivery: number;
  in_delivery: number;
  delivered: number;
  canceled: number;
}

export interface OrderStatusCounts {
  all: number;
  confirmed: number;
  picked_up: number;
  delivered: number;
  cancelled: number;
}

// ─── Item formatting ────────────────────────────────────────────────────────

export function formatOrderItems(
  items: OrderItem[] | undefined,
): OrderItemResponseDto[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    discount: item.discount,
    discountType: item.discountType,
    tax: item.tax,
  }));
}

// ─── Full order response (detail endpoint) ─────────────────────────────────

export function formatOrderDetail(
  order: Order,
  deliveryPerson?: DeliveryPerson | null,
): OrderResponseDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    documentNumber: order.documentNumber,
    receiptNumber: order.receiptNumber,
    date: order.date,
    dueDate: order.dueDate,
    validationDate: order.validationDate,
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discount,
    discountType: order.discountType,
    total: order.total,
    status: order.status || 'draft',
    direction: order.direction,
    isValidated: order.isValidated || false,
    note: order.notes,
    originType: order.originType || 'BACKOFFICE',
    deliveryStatus: order.deliveryStatus || null,
    pendingAt: order.pendingAt,
    assignedAt: order.assignedAt,
    confirmedAt: order.confirmedAt,
    pickedUpAt: order.pickedUpAt,
    toDeliveryAt: order.toDeliveryAt,
    inDeliveryAt: order.inDeliveryAt,
    deliveredAt: order.deliveredAt,
    canceledAt: order.canceledAt,
    dateCreated: order.dateCreated,
    dateUpdated: order.dateUpdated,
    customerId: order.customer?.id,
    customerName: order.customer?.name,
    customerPhone: order.customer?.phoneNumber,
    customerAddress: order.customer?.address,
    supplierId: order.supplier?.id,
    supplierName: order.supplier?.name,
    supplierPhone: order.supplier?.phoneNumber,
    supplierAddress: order.supplier?.address,
    deliveryPersonId: deliveryPerson?.id ?? null,
    deliveryPersonName: deliveryPerson?.name ?? null,
    deliveryPersonPhone: deliveryPerson?.phoneNumber ?? null,
    items: formatOrderItems(order.items),
  };
}

// ─── List item response (list/filter endpoints, no items) ──────────────────

export function formatOrderListItem(order: Order): OrderResponseDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    documentNumber: order.documentNumber,
    receiptNumber: order.receiptNumber,
    date: order.date,
    dueDate: order.dueDate,
    validationDate: order.validationDate,
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discount,
    discountType: order.discountType,
    total: order.total,
    paidAmount: order.paidAmount ?? 0,
    remainingAmount: order.remainingAmount ?? 0,
    status: order.status || 'draft',
    direction: order.direction,
    isValidated: order.isValidated || false,
    note: order.notes,
    originType: order.originType || 'BACKOFFICE',
    deliveryStatus: order.deliveryStatus || null,
    pendingAt: order.pendingAt,
    assignedAt: order.assignedAt,
    confirmedAt: order.confirmedAt,
    pickedUpAt: order.pickedUpAt,
    toDeliveryAt: order.toDeliveryAt,
    inDeliveryAt: order.inDeliveryAt,
    deliveredAt: order.deliveredAt,
    canceledAt: order.canceledAt,
    dateCreated: order.dateCreated,
    dateUpdated: order.dateUpdated,
    customerId: order.customer?.id,
    customerName: order.customer?.name,
    customerPhone: order.customer?.phoneNumber,
    customerAddress: order.customer?.address,
    supplierId: order.supplier?.id,
    supplierName: order.supplier?.name,
    supplierPhone: order.supplier?.phoneNumber,
    supplierAddress: order.supplier?.address,
    items: [],
  };
}

// ─── Delivery status timestamp ──────────────────────────────────────────────

export function applyDeliveryStatusTimestamp(
  order: Order,
  status: DeliveryStatus | string,
  now: Date,
): void {
  switch (status as DeliveryStatus) {
    case DeliveryStatus.PENDING:
      order.pendingAt = now;
      break;
    case DeliveryStatus.ASSIGNED:
      order.assignedAt = now;
      break;
    case DeliveryStatus.CONFIRMED:
      order.confirmedAt = now;
      break;
    case DeliveryStatus.PICKED_UP:
      order.pickedUpAt = now;
      break;
    case DeliveryStatus.TO_DELIVERY:
      order.toDeliveryAt = now;
      break;
    case DeliveryStatus.IN_DELIVERY:
      order.inDeliveryAt = now;
      break;
    case DeliveryStatus.DELIVERED:
      order.deliveredAt = now;
      break;
    case DeliveryStatus.CANCELED:
      order.canceledAt = now;
      break;
  }
}

// ─── Status counts (computed from raw count rows) ─────────────────────────

export function buildDeliveryStatusCounts(
  countRows: Array<{ deliveryStatus: string | null; count: string }>,
  totalAll: number,
): DeliveryStatusCounts {
  const map = new Map<string, number>();
  for (const row of countRows) {
    if (row.deliveryStatus)
      map.set(row.deliveryStatus, parseInt(row.count, 10));
  }
  return {
    all: totalAll,
    pending: map.get(DeliveryStatus.PENDING) ?? 0,
    assigned: map.get(DeliveryStatus.ASSIGNED) ?? 0,
    confirmed: map.get(DeliveryStatus.CONFIRMED) ?? 0,
    picked_up: map.get(DeliveryStatus.PICKED_UP) ?? 0,
    to_delivery: map.get(DeliveryStatus.TO_DELIVERY) ?? 0,
    in_delivery: map.get(DeliveryStatus.IN_DELIVERY) ?? 0,
    delivered: map.get(DeliveryStatus.DELIVERED) ?? 0,
    canceled: map.get(DeliveryStatus.CANCELED) ?? 0,
  };
}

export function buildOrderStatusCounts(
  countRows: Array<{ status: string | null; count: string }>,
  totalAll: number,
): OrderStatusCounts {
  const map = new Map<string, number>();
  for (const row of countRows) {
    if (row.status) map.set(row.status, parseInt(row.count, 10));
  }
  return {
    all: totalAll,
    confirmed: map.get(OrderStatus.CONFIRMED) ?? 0,
    picked_up: map.get(OrderStatus.PICKED_UP) ?? 0,
    delivered: map.get(OrderStatus.DELIVERED) ?? 0,
    cancelled: map.get(OrderStatus.CANCELLED) ?? 0,
  };
}

// ─── Status label helpers ──────────────────────────────────────────────────

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: 'Brouillon',
    [OrderStatus.VALIDATED]: 'Validée',
    [OrderStatus.IN_PROGRESS]: 'En cours',
    [OrderStatus.DELIVERED]: 'Livrée',
    [OrderStatus.INVOICED]: 'Facturée',
    [OrderStatus.CANCELLED]: 'Annulée',
    [OrderStatus.CONFIRMED]: 'Confirmée',
    [OrderStatus.PICKED_UP]: 'Récupérée',
  };
  return labels[status] ?? status;
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    [DeliveryStatus.PENDING]: 'En attente',
    [DeliveryStatus.ASSIGNED]: 'Assignée',
    [DeliveryStatus.CONFIRMED]: 'Confirmée',
    [DeliveryStatus.PICKED_UP]: 'Récupérée',
    [DeliveryStatus.TO_DELIVERY]: 'Vers livraison',
    [DeliveryStatus.IN_DELIVERY]: 'En livraison',
    [DeliveryStatus.DELIVERED]: 'Livrée',
    [DeliveryStatus.CANCELED]: 'Annulée',
  };
  return labels[status] ?? status;
}

// ─── XLSX export row builders ──────────────────────────────────────────────

export function buildOrderExportBaseRow(order: Order) {
  const isBonAchat = !!order.supplierId;
  const docRef = order.orderNumber ?? order.documentNumber;
  return {
    Numéro: docRef,
    'N° reçu': order.receiptNumber ?? '',
    Date: order.date ? new Date(order.date).toLocaleDateString('fr-FR') : '',
    'Date échéance': order.dueDate
      ? new Date(order.dueDate).toLocaleDateString('fr-FR')
      : '',
    Type: isBonAchat ? "Bon d'achat" : 'Bon de livraison',
    'Client/Fournisseur': isBonAchat
      ? order.supplierName || order.supplier?.name || ''
      : order.customerName || order.customer?.name || '',
    Téléphone: isBonAchat
      ? order.supplierPhone || ''
      : order.customerPhone || '',
    Adresse: isBonAchat
      ? order.supplierAddress || order.supplier?.address || ''
      : order.customerAddress || order.customer?.address || '',
    Statut: getOrderStatusLabel(order.status),
    'Statut livraison': order.deliveryStatus
      ? getDeliveryStatusLabel(order.deliveryStatus)
      : '',
    'Sous-total': Number(order.subtotal),
    Remise: Number(order.discount),
    'Type remise': order.discountType === 0 ? 'Montant' : 'Pourcentage',
    Taxe: Number(order.tax),
    Total: Number(order.total),
    Origine: order.originType || 'BACKOFFICE',
    Notes: order.notes || '',
  };
}

export function buildOrderExportRows(order: Order): Record<string, unknown>[] {
  const base = buildOrderExportBaseRow(order);
  const emptyItem = {
    Ligne: '',
    'Code produit': '',
    'Produit/Service': '',
    Quantité: '',
    'Prix unitaire': '',
    'Remise ligne': '',
    'Type remise ligne': '',
    'Taxe ligne (%)': '',
    'Total ligne': '',
  };

  if (!order.items?.length) return [{ ...base, ...emptyItem }];

  return order.items.map((item, index) => ({
    ...base,
    Ligne: index + 1,
    'Code produit': item.product?.code || '',
    'Produit/Service': item.description,
    Quantité: Number(item.quantity),
    'Prix unitaire': Number(item.unitPrice),
    'Remise ligne': Number(item.discount),
    'Type remise ligne': item.discountType === 0 ? 'Montant' : 'Pourcentage',
    'Taxe ligne (%)': Number(item.tax),
    'Total ligne': Number(item.total),
  }));
}

export const ORDER_XLSX_COL_WIDTHS = [
  { wch: 15 },
  { wch: 12 },
  { wch: 15 },
  { wch: 18 },
  { wch: 25 },
  { wch: 15 },
  { wch: 30 },
  { wch: 15 },
  { wch: 18 },
  { wch: 12 },
  { wch: 10 },
  { wch: 12 },
  { wch: 10 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 30 },
  { wch: 8 },
  { wch: 15 },
  { wch: 25 },
  { wch: 10 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 12 },
  { wch: 12 },
];
