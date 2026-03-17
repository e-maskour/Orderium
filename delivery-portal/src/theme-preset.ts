// ============================================================
// Delivery Portal — PrimeReact Theme Preset
// Primary color: Orange #df7817
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
//   shared/ui/src/styles.css       → imports lara-light-amber, then overrides
//                                    all hardcoded amber hex values using
//                                    var(--primary-color) and var(--primary-NNN).
//   delivery-portal/src/theme.css  → sets --primary-color: #df7817 (orange scale)
//                                    imported AFTER @orderium/ui/styles.css, so
//                                    it wins the cascade for every component.
//
// Result: every PrimeReact component (Button, Checkbox, DataTable, Calendar,
// TabMenu, Dropdown, Badge, Tag, ProgressBar, etc.) renders in Orange #df7817.

import { orderiumPrimeConfig } from '@orderium/ui/theme';

// App-specific brand tokens — kept in sync with theme.css
export const brandTokens = {
    primary: '#df7817',
    primaryDark: '#be6614',
    primaryDeep: '#7c420d',
    palette: {
        50: '#fef6ec',
        100: '#fde8c9',
        200: '#fbcf97',
        300: '#f8b360',
        400: '#f4962d',
        500: '#df7817',
        600: '#be6614',
        700: '#9d5310',
        800: '#7c420d',
        900: '#5b3009',
    },
} as const;

/**
 * PrimeReact provider config for the Delivery Portal app.
 * Use as: <PrimeReactProvider value={deliveryPortalConfig}>
 */
export const deliveryPortalConfig = {
    ...orderiumPrimeConfig,
} as const;

export default deliveryPortalConfig;
