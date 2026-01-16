export interface Payment {
  id: number;
  invoiceId: number;
  customerId?: number;
  supplierId?: number;
  amount: number;
  paymentDate: string;
  paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
  notes?: string;
  referenceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  invoiceId: number;
  customerId?: number;
  supplierId?: number;
  amount: number;
  paymentDate: string;
  paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
  notes?: string;
  referenceNumber?: string;
}

export interface UpdatePaymentRequest {
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
