// ============================================================
// Backoffice — PrimeReact Theme Preset
// Primary color: Blue #235ae4
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
//   backoffice/src/theme.css  → sets --primary-color: #235ae4 (blue scale)
//                               imported AFTER @orderium/ui/styles.css, so
//                               it wins the cascade for every component.
//
// Result: every PrimeReact component (Button, Checkbox, DataTable, Calendar,
// TabMenu, Dropdown, Badge, Tag, ProgressBar, etc.) renders in Blue #235ae4.

import { orderiumPrimeConfig } from '@orderium/ui/theme';

// App-specific brand tokens — kept in sync with theme.css
export const brandTokens = {
  primary: '#235ae4',
  primaryDark: '#1c4bc4',
  primaryDeep: '#0f2d7a',
  palette: {
    50: '#eef1fd',
    100: '#d4def9',
    200: '#abc0f4',
    300: '#829fed',
    400: '#587de7',
    500: '#235ae4',
    600: '#1c4bc4',
    700: '#163ba0',
    800: '#0f2d7a',
    900: '#0a1e52',
  },
} as const;

/**
 * PrimeReact provider config for the Backoffice app.
 * Use as: <PrimeReactProvider value={backofficeConfig}>
 */
export const backofficeConfig = {
  ...orderiumPrimeConfig,
} as const;

export default backofficeConfig;
