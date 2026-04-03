import { type ReactNode } from 'react';
import { notify, confirmAction as _confirmAction, type ConfirmVariant } from '@orderium/ui';

interface ToastOptions {
  description?: ReactNode;
  icon?: ReactNode;
  duration?: number | null;
}

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

/**
 * Opens the global ConfirmDialog modal imperatively.
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
  _confirmAction({
    title,
    description: typeof options?.description === 'string' ? options.description : undefined,
    detail: options?.detail,
    confirmLabel: options?.confirmLabel ?? 'Confirmer',
    cancelLabel: 'Annuler',
    variant: options?.variant ?? 'destructive',
    onConfirm,
  });
}
