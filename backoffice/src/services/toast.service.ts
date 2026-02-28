import { type ReactNode, createElement } from 'react';
import { sileo } from 'sileo';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  PlusCircle,
  Pencil,
  Download,
  Upload,
  Send,
  FileText,
  Link,
  Archive,
  ShieldCheck,
  ShieldOff,
  Truck,
  Ban,
  Copy,
} from 'lucide-react';

const icon = (Icon: typeof CheckCircle, color?: string) =>
  createElement(Icon, { size: 18, color });

interface ToastOptions {
  description?: ReactNode;
  icon?: ReactNode;
  duration?: number | null;
}

// ── Base toasts ──────────────────────────────────────────
export function toastSuccess(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(CheckCircle, '#16a34a'), title: message, ...options });
}

export function toastError(message: string, options?: ToastOptions) {
  sileo.error({ icon: icon(XCircle, '#dc2626'), title: message, ...options });
}

export function toastWarning(message: string, options?: ToastOptions) {
  sileo.warning({ icon: icon(AlertTriangle, '#d97706'), title: message, ...options });
}

export function toastInfo(message: string, options?: ToastOptions) {
  sileo.info({ icon: icon(Info, '#2563eb'), title: message, ...options });
}

// ── Action-specific toasts ───────────────────────────────
export function toastCreated(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(PlusCircle, '#16a34a'), title: message, ...options });
}

export function toastUpdated(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Pencil, '#2563eb'), title: message, ...options });
}

export function toastDeleted(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Trash2, '#dc2626'), title: message, ...options });
}

export function toastExported(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Download, '#16a34a'), title: message, ...options });
}

export function toastImported(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Upload, '#2563eb'), title: message, ...options });
}

export function toastSent(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Send, '#16a34a'), title: message, ...options });
}

export function toastValidated(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(ShieldCheck, '#16a34a'), title: message, ...options });
}

export function toastDevalidated(message: string, options?: ToastOptions) {
  sileo.warning({ icon: icon(ShieldOff, '#d97706'), title: message, ...options });
}

export function toastDelivered(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Truck, '#16a34a'), title: message, ...options });
}

export function toastCancelled(message: string, options?: ToastOptions) {
  sileo.warning({ icon: icon(Ban, '#d97706'), title: message, ...options });
}

export function toastArchived(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Archive, '#6b7280'), title: message, ...options });
}

export function toastCopied(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Copy, '#16a34a'), title: message, ...options });
}

export function toastDocument(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(FileText, '#2563eb'), title: message, ...options });
}

export function toastLinked(message: string, options?: ToastOptions) {
  sileo.success({ icon: icon(Link, '#2563eb'), title: message, ...options });
}

// ── Confirm toast ────────────────────────────────────────
export function toastConfirm(
  message: string,
  onConfirm: () => void,
  options?: { confirmLabel?: string; description?: ReactNode; icon?: ReactNode },
) {
  sileo.action({
    title: message,
    description: options?.description,
    icon: options?.icon ?? icon(AlertTriangle, '#d97706'),
    duration: null,
    button: {
      title: options?.confirmLabel ?? 'Confirmer',
      onClick: onConfirm,
    },
  });
}
