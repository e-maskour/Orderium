export type OrderPaymentType = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';

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

export interface UpdateOrderPaymentDTO extends Partial<Omit<CreateOrderPaymentDTO, 'orderId'>> { }

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
