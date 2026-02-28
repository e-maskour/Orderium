import { type ReactNode } from 'react';
import { sileo } from 'sileo';

interface ToastOptions {
  description?: ReactNode;
  icon?: ReactNode;
  duration?: number | null;
}

export function toastSuccess(message: string, options?: ToastOptions) {
  sileo.success({ title: message, ...options });
}

export function toastError(message: string, options?: ToastOptions) {
  sileo.error({ title: message, ...options });
}

export function toastWarning(message: string, options?: ToastOptions) {
  sileo.warning({ title: message, ...options });
}

export function toastInfo(message: string, options?: ToastOptions) {
  sileo.info({ title: message, ...options });
}

export function toastConfirm(
  message: string,
  onConfirm: () => void,
  options?: { confirmLabel?: string; description?: ReactNode; icon?: ReactNode },
) {
  sileo.action({
    title: message,
    description: options?.description,
    icon: options?.icon,
    duration: null,
    button: {
      title: options?.confirmLabel ?? 'Confirm',
      onClick: onConfirm,
    },
  });
}
