// @orderium/ui - Shared UI Module
// Theme configuration and locale exports
// Apps import PrimeReact components directly from 'primereact/*'
// This module provides centralized theme config, locales, and styles

export { orderiumPrimeConfig, arabicLocale, frenchLocale } from './theme';
export { formatAmount, formatCurrency } from './formatAmount';

// Usage:
// import '@orderium/ui/styles'                                    → Global styles + PrimeReact CSS
// import { orderiumPrimeConfig } from '@orderium/ui/theme'        → PrimeReact config
// import { Button } from 'primereact/button'                     → Components imported directly
// import { formatAmount, formatCurrency } from '@orderium/ui'    → Amount formatters
