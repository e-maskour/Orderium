// @orderium/ui - Shared UI Module
// Theme configuration, locale exports, and shared components
// Apps import PrimeReact components directly from 'primereact/*'
// This module provides centralized theme config, locales, styles, and notifications

export { orderiumPrimeConfig, arabicLocale, frenchLocale } from './theme';
export { formatAmount, formatCurrency } from './formatAmount';

// Toast system
export { toast, Toaster } from './toast';
export type { Toast, ToastType, ToasterPosition } from './toast';

// Notification helper (wraps toast with icons)
export { notify } from './notify';

// Confirm dialog
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmVariant, ConfirmDialogProps } from './ConfirmDialog';
export { ConfirmProvider, useConfirm, confirmAction } from './ConfirmContext';
export type { ConfirmOptions, ConfirmFn } from './ConfirmContext';

// Usage:
// import '@orderium/ui/styles'                                    → Global styles + PrimeReact CSS
// import { orderiumPrimeConfig } from '@orderium/ui/theme'        → PrimeReact config
// import { Button } from 'primereact/button'                     → Components imported directly
// import { formatAmount, formatCurrency } from '@orderium/ui'    → Amount formatters
