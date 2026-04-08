import { type ReactNode } from 'react';
import {
  notify,
  confirmAction as _confirmAction,
  alertAction,
  type ConfirmVariant,
} from '@orderium/ui';

interface ToastOptions {
  description?: ReactNode;
  icon?: ReactNode;
  duration?: number | null;
}

// ── Base toasts ──────────────────────────────────────────
export function toastSuccess(message: string, options?: ToastOptions) {
  notify.success(message, options);
}

export function toastError(message: string, options?: ToastOptions) {
  notify.error(message, options);
}

export function toastWarning(message: string, options?: ToastOptions) {
  notify.warning(message, options);
}

export function toastInfo(message: string, options?: ToastOptions) {
  notify.info(message, options);
}

// ── Action-specific toasts ───────────────────────────────
export function toastCreated(message: string, options?: ToastOptions) {
  notify.created(message, options);
}

export function toastUpdated(message: string, options?: ToastOptions) {
  notify.updated(message, options);
}

export function toastDeleted(message: string, options?: ToastOptions) {
  notify.deleted(message, options);
}

export function toastExported(message: string, options?: ToastOptions) {
  notify.exported(message, options);
}

export function toastImported(message: string, options?: ToastOptions) {
  notify.imported(message, options);
}

export function toastSent(message: string, options?: ToastOptions) {
  notify.sent(message, options);
}

export function toastValidated(message: string, options?: ToastOptions) {
  notify.validated(message, options);
}

export function toastDevalidated(message: string, options?: ToastOptions) {
  notify.devalidated(message, options);
}

export function toastDelivered(message: string, options?: ToastOptions) {
  notify.delivered(message, options);
}

export function toastCancelled(message: string, options?: ToastOptions) {
  notify.cancelled(message, options);
}

export function toastArchived(message: string, options?: ToastOptions) {
  notify.archived(message, options);
}

export function toastCopied(message: string, options?: ToastOptions) {
  notify.copied(message, options);
}

export function toastDocument(message: string, options?: ToastOptions) {
  notify.document(message, options);
}

export function toastLinked(message: string, options?: ToastOptions) {
  notify.linked(message, options);
}

// ── Confirm dialog ───────────────────────────────────────
/**
 * Opens the global ConfirmDialog modal.
 * Maps the legacy toastConfirm() signature — callers need no changes.
 *
 * Variant heuristic:
 *   - "delete" / "supprimer" / "annuler" / "cancel" / "reject" in the message → 'destructive'
 *   - "désactiver" / "bloquer" / "revert" / "devalidate" in the message → 'warning'
 *   - otherwise → 'info'
 */
export function toastConfirm(
  title: string,
  onConfirm: () => void,
  options?: {
    confirmLabel?: string;
    description?: ReactNode;
    detail?: string;
    variant?: ConfirmVariant;
  },
) {
  // Infer variant from title when not explicitly provided
  const inferredVariant: ConfirmVariant = options?.variant ?? inferVariant(title);
  _confirmAction({
    title,
    description: typeof options?.description === 'string' ? options.description : undefined,
    detail: options?.detail,
    confirmLabel: options?.confirmLabel ?? 'Confirmer',
    cancelLabel: 'Annuler',
    variant: inferredVariant,
    onConfirm,
  });
}

function inferVariant(title: string): ConfirmVariant {
  const lower = title.toLowerCase();
  if (
    lower.includes('supprim') ||
    lower.includes('delet') ||
    lower.includes('annul') ||
    lower.includes('cancel') ||
    lower.includes('reject') ||
    lower.includes('refus') ||
    lower.includes('void') ||
    lower.includes('invalide') ||
    lower.includes('حذف') || // Arabic: delete
    lower.includes('إلغاء') || // Arabic: cancel/annul
    lower.includes('رفض') // Arabic: reject
  ) {
    return 'destructive';
  }
  if (
    lower.includes('désactiv') ||
    lower.includes('bloquer') ||
    lower.includes('revert') ||
    lower.includes('dévalid') ||
    lower.includes('désassign') ||
    lower.includes('unassign') ||
    lower.includes('تعطيل') || // Arabic: disable
    lower.includes('حظر') // Arabic: block
  ) {
    return 'warning';
  }
  return 'info';
}

// ── Deletion guard alert ─────────────────────────────────
/**
 * Call in delete `catch` blocks. If the API returned a known deletion-guard
 * error code, opens the AlertDialog with a translated message.
 * Falls back to toastError for unknown errors.
 *
 * @param error   The caught error
 * @param t       The translation function from useLanguage()
 */
const DELETION_ERROR_CODES = new Set([
  'PRODUCT_IN_INVOICES',
  'PRODUCT_IN_ORDERS',
  'PRODUCT_IN_QUOTES',
  'ORDER_VALIDATED',
  'ORDER_HAS_PAYMENTS',
  'INVOICE_VALIDATED',
  'INVOICE_HAS_PAYMENTS',
  'QUOTE_VALIDATED',
  'QUOTE_CONVERTED_TO_INVOICE',
  'PARTNER_HAS_DOCUMENTS',
  'DELIVERY_PERSON_HAS_ORDERS',
  'CATEGORY_HAS_CHILDREN',
  'CATEGORY_HAS_PRODUCTS',
  'WAREHOUSE_HAS_PRODUCTS',
]);

export function toastDeleteError(error: unknown, t: (key: string) => string): void {
  const code = (error as Error)?.message ?? '';
  if (DELETION_ERROR_CODES.has(code)) {
    void alertAction({
      variant: 'destructive',
      title: t('deletionBlocked'),
      description: t(code),
    });
  } else {
    toastError(t('deleteError'), {
      description: (error as Error)?.message || String(error),
    });
  }
}
