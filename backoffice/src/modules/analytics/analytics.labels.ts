/**
 * Display labels for the coded values reports return (statuses, sales
 * channels, payment methods, movement types…), so tables never show raw
 * database codes like `delivered` or `ADMIN_POS`.
 *
 * Values mirror the API enums: OrderStatus, InvoiceStatus, OrderOriginType,
 * DocumentDirection, PaymentType and MovementType. Lookups are
 * case-insensitive; unknown values fall back to the raw value.
 */
import type { TranslationKey } from '../../lib/i18n';
import type { StatusTone } from '../../components/ui/StatusBadge';

interface ValueLabel {
  labelKey: TranslationKey;
  /** Rendered as a coloured badge when set. */
  tone?: StatusTone;
}

const STATUS: Record<string, ValueLabel> = {
  DRAFT: { labelKey: 'analyticsValDraft', tone: 'draft' },
  VALIDATED: { labelKey: 'analyticsValValidated', tone: 'info' },
  IN_PROGRESS: { labelKey: 'analyticsValInProgress', tone: 'warning' },
  CONFIRMED: { labelKey: 'analyticsValConfirmed', tone: 'info' },
  PICKED_UP: { labelKey: 'analyticsValPickedUp', tone: 'info' },
  DELIVERED: { labelKey: 'analyticsValDelivered', tone: 'success' },
  INVOICED: { labelKey: 'analyticsValInvoiced', tone: 'success' },
  CANCELLED: { labelKey: 'analyticsValCancelled', tone: 'danger' },
  UNPAID: { labelKey: 'analyticsValUnpaid', tone: 'unpaid' },
  PARTIAL: { labelKey: 'analyticsValPartial', tone: 'partial' },
  PAID: { labelKey: 'analyticsValPaid', tone: 'paid' },
};

const CHANNEL: Record<string, ValueLabel> = {
  BACKOFFICE: { labelKey: 'analyticsValBackoffice' },
  CLIENT_POS: { labelKey: 'analyticsValClientPortal' },
  ADMIN_POS: { labelKey: 'analyticsValAdminPos' },
};

const DIRECTION: Record<string, ValueLabel> = {
  VENTE: { labelKey: 'analyticsValSale', tone: 'info' },
  ACHAT: { labelKey: 'analyticsValPurchase', tone: 'neutral' },
};

const METHOD: Record<string, ValueLabel> = {
  CASH: { labelKey: 'analyticsValCash' },
  CHECK: { labelKey: 'analyticsValCheck' },
  BANK_TRANSFER: { labelKey: 'analyticsValBankTransfer' },
  CREDIT_CARD: { labelKey: 'analyticsValCreditCard' },
  MOBILE_PAYMENT: { labelKey: 'analyticsValMobilePayment' },
  OTHER: { labelKey: 'analyticsValOther' },
};

const MOVEMENT: Record<string, ValueLabel> = {
  RECEIPT: { labelKey: 'analyticsValReceipt', tone: 'success' },
  DELIVERY: { labelKey: 'analyticsValDelivery', tone: 'info' },
  INTERNAL: { labelKey: 'analyticsValInternal', tone: 'neutral' },
  ADJUSTMENT: { labelKey: 'analyticsValAdjustment', tone: 'warning' },
  PRODUCTION_IN: { labelKey: 'analyticsValProductionIn', tone: 'success' },
  PRODUCTION_OUT: { labelKey: 'analyticsValProductionOut', tone: 'info' },
  RETURN_IN: { labelKey: 'analyticsValReturnIn', tone: 'success' },
  RETURN_OUT: { labelKey: 'analyticsValReturnOut', tone: 'warning' },
  SCRAP: { labelKey: 'analyticsValScrap', tone: 'danger' },
};

/** Report row field → its value dictionary. */
const FIELD_VALUES: Record<string, Record<string, ValueLabel>> = {
  status: STATUS,
  channel: CHANNEL,
  direction: DIRECTION,
  method: METHOD,
  topMethod: METHOD,
  movementType: MOVEMENT,
};

/** True when a field holds coded values this module can label. */
export function isCodedField(field: string): boolean {
  return field in FIELD_VALUES;
}

/** Label (and badge tone) for a coded value, or `null` when unknown. */
export function codedValue(
  field: string,
  value: unknown,
  t: (key: TranslationKey) => string,
): { label: string; tone?: StatusTone } | null {
  if (typeof value !== 'string' || value === '') return null;
  const hit = FIELD_VALUES[field]?.[value.toUpperCase()];
  return hit ? { label: t(hit.labelKey), tone: hit.tone } : null;
}
