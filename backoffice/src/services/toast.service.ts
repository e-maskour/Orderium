import { type ReactNode, createElement } from 'react';
import { notify } from '@orderium/ui';
import { AlertTriangle } from 'lucide-react';

const icon = (Icon: typeof AlertTriangle, color?: string) =>
  createElement(Icon, { size: 18, color });

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

// ── Confirm toast ────────────────────────────────────────
export function toastConfirm(
  message: string,
  onConfirm: () => void,
  options?: { confirmLabel?: string; description?: ReactNode; icon?: ReactNode },
) {
  notify.action(message, options?.confirmLabel ?? 'Confirmer', onConfirm, {
    description: options?.description,
    icon: options?.icon ?? icon(AlertTriangle, '#d97706'),
  });
}
