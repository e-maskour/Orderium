import { type ReactNode } from 'react';
import { notify } from '@orderium/ui';

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

export function toastConfirm(
  message: string,
  onConfirm: () => void,
  options?: { confirmLabel?: string; description?: ReactNode; icon?: ReactNode },
) {
  notify.action(message, options?.confirmLabel ?? 'Confirm', onConfirm, {
    description: options?.description,
    icon: options?.icon,
  });
}
