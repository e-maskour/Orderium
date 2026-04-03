/**
 * Query-building constants and helpers for the orders module.
 * These reduce duplication in orders.service.ts where the same SELECT field
 * lists and filter logic were repeated across several methods.
 */
import { SelectQueryBuilder } from 'typeorm';
import { Order } from './entities/order.entity';

// ─── Shared SELECT field lists ─────────────────────────────────────────────

/** Scalar order fields selected on list / filter queries (no items/products). */
export const ORDER_LIST_FIELDS = [
  'order.id',
  'order.documentNumber',
  'order.receiptNumber',
  'order.date',
  'order.dueDate',
  'order.validationDate',
  'order.subtotal',
  'order.tax',
  'order.discount',
  'order.discountType',
  'order.total',
  'order.paidAmount',
  'order.remainingAmount',
  'order.status',
  'order.direction',
  'order.isValidated',
  'order.notes',
  'order.fromPortal',
  'order.fromClient',
  'order.deliveryStatus',
  'order.pendingAt',
  'order.assignedAt',
  'order.confirmedAt',
  'order.pickedUpAt',
  'order.toDeliveryAt',
  'order.inDeliveryAt',
  'order.deliveredAt',
  'order.canceledAt',
  'order.dateCreated',
  'order.dateUpdated',
];

export const CUSTOMER_SUMMARY_FIELDS = [
  'customer.id',
  'customer.name',
  'customer.phoneNumber',
  'customer.address',
  'customer.ice',
];

export const SUPPLIER_SUMMARY_FIELDS = [
  'supplier.id',
  'supplier.name',
  'supplier.phoneNumber',
  'supplier.address',
  'supplier.ice',
];

export const ORDER_ITEM_FIELDS = [
  'items.id',
  'items.orderId',
  'items.productId',
  'items.description',
  'items.quantity',
  'items.unitPrice',
  'items.discount',
  'items.discountType',
  'items.tax',
  'items.total',
];

export const PRODUCT_SUMMARY_FIELDS = [
  'product.id',
  'product.name',
  'product.price',
];

// ─── Filter application helpers ─────────────────────────────────────────────

export interface OrderListFilters {
  fromPortal?: boolean;
  fromClient?: boolean;
  deliveryStatus?: string | string[];
  status?: string[];
  search?: string;
  orderNumber?: string;
  customerId?: number;
  supplierId?: number;
  deliveryPersonId?: number;
  direction?: 'ACHAT' | 'VENTE';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Applies filter conditions to an order query builder.
 * Returns the same builder for chaining.
 */
export function applyOrderFilters(
  qb: SelectQueryBuilder<Order>,
  filters: OrderListFilters,
): SelectQueryBuilder<Order> {
  if (filters.fromPortal !== undefined) {
    qb.andWhere('order.fromPortal = :fromPortal', {
      fromPortal: filters.fromPortal,
    });
  }

  if (filters.search) {
    qb.andWhere(
      '(LOWER(customer.name) LIKE LOWER(:search) OR LOWER(customer.phoneNumber) LIKE LOWER(:search) OR LOWER(order.documentNumber) LIKE LOWER(:search))',
      { search: `%${filters.search}%` },
    );
    // In search mode the remaining filter-panel conditions are skipped
    return qb;
  }

  if (filters.fromClient !== undefined) {
    qb.andWhere('order.fromClient = :fromClient', {
      fromClient: filters.fromClient,
    });
  }
  if (filters.orderNumber) {
    qb.andWhere('order.documentNumber = :orderNumber', {
      orderNumber: filters.orderNumber,
    });
  }
  if (filters.deliveryStatus) {
    const statuses = Array.isArray(filters.deliveryStatus)
      ? filters.deliveryStatus
      : [filters.deliveryStatus];
    if (statuses.length === 1) {
      qb.andWhere('order.deliveryStatus = :deliveryStatus', {
        deliveryStatus: statuses[0],
      });
    } else {
      qb.andWhere('order.deliveryStatus IN (:...deliveryStatuses)', {
        deliveryStatuses: statuses,
      });
    }
  }
  if (filters.status?.length) {
    qb.andWhere('order.status IN (:...orderStatuses)', {
      orderStatuses: filters.status,
    });
  }
  if (filters.customerId) {
    qb.andWhere('order.customerId = :customerId', {
      customerId: filters.customerId,
    });
  }
  if (filters.supplierId) {
    qb.andWhere('order.supplierId = :supplierId', {
      supplierId: filters.supplierId,
    });
  }
  if (filters.deliveryPersonId) {
    qb.andWhere('delivery.deliveryPersonId = :deliveryPersonId', {
      deliveryPersonId: filters.deliveryPersonId,
    });
  }
  if (filters.startDate && filters.endDate) {
    qb.andWhere('order.dateCreated >= :startDate', {
      startDate: filters.startDate,
    });
    qb.andWhere('order.dateCreated <= :endDate', { endDate: filters.endDate });
  }

  return qb;
}
