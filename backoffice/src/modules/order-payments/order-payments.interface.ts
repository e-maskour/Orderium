export type OrderPaymentType =
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'credit_card'
  | 'mobile_payment'
  | 'other';

export interface IOrderPayment {
  id: number;
  orderId: number;
  customerId?: number | null;
  amount: number;
  paymentDate: string;
  paymentType: OrderPaymentType;
  notes?: string | null;
  referenceNumber?: string | null;
  dateCreated: string;
  dateUpdated: string;
  // Relations fetched from API when listing all
  orderNumber?: string | null;
  customerName?: string | null;
}

export interface CreateOrderPaymentDTO {
  orderId: number;
  customerId?: number;
  amount: number;
  paymentDate: string;
  paymentType: OrderPaymentType;
  notes?: string;
  referenceNumber?: string;
}

export type UpdateOrderPaymentDTO = Partial<Omit<CreateOrderPaymentDTO, 'orderId'>>;

export type CaissePaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface ICaisseOrder {
  id: number;
  orderNumber: string;
  customerName: string | null;
  customerId: number | null;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: CaissePaymentStatus;
  date: string;
  dateCreated: string;
}

export const ORDER_PAYMENT_TYPE_LABELS: Record<OrderPaymentType, string> = {
  cash: 'Espèce',
  check: 'Chèque',
  bank_transfer: 'Virement bancaire',
  credit_card: 'Carte de crédit',
  mobile_payment: 'Paiement mobile',
  other: 'Autre',
};

export interface CaisseFilters {
  search?: string;
  status?: 'all' | CaissePaymentStatus;
  page?: number;
  limit?: number;
  /** Server-side sort; omitted → newest first. */
  sortField?: CaisseSortField;
  sortOrder?: 'ASC' | 'DESC';
}

/** Mirrors CAISSE_SORT_FIELDS in api/src/modules/orders/dto/filter-caisse.dto.ts. */
export type CaisseSortField =
  | 'orderNumber'
  | 'customerName'
  | 'paymentStatus'
  | 'total'
  | 'paidAmount'
  | 'remainingAmount'
  | 'dateCreated';

export interface CaissePage {
  orders: ICaisseOrder[];
  total: number;
  counts: Record<'all' | CaissePaymentStatus, number>;
  summary: { totalDue: number; totalCollected: number; totalRemaining: number };
}
