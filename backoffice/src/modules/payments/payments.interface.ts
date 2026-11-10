export interface PaymentFilters {
  invoiceId?: number;
  customerId?: number;
  supplierId?: number;
  paymentType?: string;
  /** Inclusive lower bound, local calendar day (YYYY-MM-DD) */
  dateFrom?: string;
  /** Inclusive upper bound, local calendar day (YYYY-MM-DD) */
  dateTo?: string;
  search?: string;
  direction?: 'vente' | 'achat';
  page?: number;
  limit?: number;
  sortField?: 'paymentDate' | 'paymentType' | 'referenceNumber' | 'amount' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaymentInvoiceRef {
  id: number;
  documentNumber: string | null;
  direction: string | null;
  customerId: number | null;
  customerName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  total: number | null;
}

export interface CreatePaymentDTO {
  invoiceId: number;
  customerId?: number;
  supplierId?: number;
  amount: number;
  paymentDate: string;
  paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
  notes?: string;
  referenceNumber?: string;
}

export interface UpdatePaymentDTO {
  customerId?: number;
  supplierId?: number;
  amount?: number;
  paymentDate?: string;
  paymentType?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
  notes?: string;
  referenceNumber?: string;
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: 'Espèce',
  check: 'Chèque',
  bank_transfer: 'Virement bancaire',
  credit_card: 'Carte de crédit',
  mobile_payment: 'Paiement mobile',
  other: 'Autre',
};
