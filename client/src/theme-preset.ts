// ============================================================
// Client Portal — PrimeReact Theme Preset
// Primary color: Emerald #059669
// ============================================================
//
// PrimeReact v10 Architecture Note:
// ----------------------------------
// PrimeReact v10 (used here) is NOT the same as PrimeReact v4/v5.
// The `definePreset()` design-token API belongs to v4/v5 only.
// In v10, theming is done via:
//   1. A base CSS theme imported in @orderium/ui/styles.css
//      (lara-light-amber is the base; all amber/yellow values are
//       overridden by CSS custom properties in this app's theme.css)
//   2. Per-app theme.css that overrides CSS custom properties such as
//      --primary-color, --primary-50 … --primary-900, --highlight-bg, etc.
//   3. The PrimeReactProvider `value` prop for runtime JS options
//      (ripple, inputStyle, z-indices, locale).
//
// Color propagation:
//   shared/ui/src/styles.css  → imports lara-light-amber, then overrides
//                               all hardcoded amber hex values using
//                               var(--primary-color) and var(--primary-NNN).
//   client/src/theme.css      → sets --primary-color: #059669 (emerald scale)
//                               imported AFTER @orderium/ui/styles.css, so
//                               it wins the cascade for every component.
//
// Result: every PrimeReact component (Button, Checkbox, DataTable, Calendar,
// TabMenu, Dropdown, Badge, Tag, ProgressBar, etc.) renders in Emerald #059669.

import { orderiumPrimeConfig } from '@orderium/ui/theme';

// App-specific brand tokens — kept in sync with theme.css
export const brandTokens = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryDeep: '#064e3b',
  palette: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#059669',
    600: '#047857',
    700: '#065f46',
    800: '#064e3b',
    900: '#022c22',
  },
} as const;

/**
 * PrimeReact provider config for the Client Portal app.
 * Use as: <PrimeReactProvider value={clientConfig}>
 */
export const clientConfig = {
  ...orderiumPrimeConfig,
} as const;

export default clientConfig;
