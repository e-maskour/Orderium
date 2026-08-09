import type { SubscriptionPlan, TenantStatus } from './tenant';

/**
 * Derived server-side from the validated installments — never stored, so it
 * cannot contradict the money actually recorded.
 * Precedence: void > paid > overdue > partial > pending.
 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'void';

export type PaymentType = 'bank_transfer' | 'cash' | 'check' | 'card' | 'other';

export type InstallmentStatus = 'pending' | 'validated' | 'rejected' | 'refunded';

export type BillingCycle = 'monthly' | 'yearly';

/** Client details carried with each obligation. */
export interface PaymentTenant {
  id: number;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  status: TenantStatus;
  subscriptionPlan: SubscriptionPlan;
}

/** A tranche: one act of payment against an obligation. */
export interface Installment {
  id: string;
  paymentId: string;
  tenantId: number;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  status: InstallmentStatus;
  referenceNumber: string | null;
  receiptUrl: string | null;
  notes: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An obligation: what a tenant owes for one billing period. */
export interface Payment {
  id: string;
  tenantId: number;
  tenant?: PaymentTenant;
  amountDue: number;
  currency: string;
  planName: SubscriptionPlan;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  voidedAt: string | null;
  voidReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // ── Derived in SQL ──
  amountPaid: number;
  amountRemaining: number;
  amountRefunded: number;
  status: PaymentStatus;
  /** True whenever a balance is outstanding past `dueDate`, even if partial. */
  isOverdue: boolean;
  installmentCount: number;
}

export interface PaymentDetail extends Payment {
  installments: Installment[];
}

export interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Totals are grouped by currency — never summed across currencies. */
export interface BillingSummaryRow {
  currency: string;
  invoiceCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface ListPaymentsParams {
  tenantId?: number;
  status?: PaymentStatus | 'all';
  billingCycle?: BillingCycle | 'all';
  planName?: SubscriptionPlan | 'all';
  currency?: string;
  periodFrom?: string;
  periodTo?: string;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | 'dueDate'
    | 'periodStart'
    | 'periodEnd'
    | 'amountDue'
    | 'amountRemaining'
    | 'createdAt'
    | 'tenantName';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreatePaymentInput {
  amountDue: number;
  currency?: string;
  planName: SubscriptionPlan;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  notes?: string;
}

export type UpdatePaymentInput = Partial<CreatePaymentInput>;

export interface CreateInstallmentInput {
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  /** Defaults to true server-side. */
  validateImmediately?: boolean;
}

export type UpdateInstallmentInput = Partial<Omit<CreateInstallmentInput, 'validateImmediately'>>;

// ─── Display metadata ────────────────────────────────────────────────────────

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  check: 'Cheque',
  card: 'Card',
  other: 'Other',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Awaiting validation',
  validated: 'Validated',
  rejected: 'Rejected',
  refunded: 'Refunded',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const PAYMENT_TYPES: PaymentType[] = ['bank_transfer', 'cash', 'check', 'card', 'other'];
