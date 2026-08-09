/**
 * ═══════════════════════════════════════════════════════════════
 *  MOROCOM — Access Control Module Registry
 * ═══════════════════════════════════════════════════════════════
 *
 *  The SINGLE SOURCE OF TRUTH for the permission catalogue.
 *
 *  Modelled on Odoo:
 *    - a `category` groups modules the way Odoo groups apps on the
 *      user form (Sales / Inventory / Accounting / Administration);
 *    - a `level` (none | read | user | manager) is a named bundle of
 *      actions, matching Odoo's per-app radio selector. A role stores
 *      the expanded permission set, so a level is a UI affordance
 *      rather than a stored value — a set that matches no bundle is
 *      simply displayed as "custom".
 *
 *  This file drives:
 *    1. permission seeding (`buildPermissionCatalogue`),
 *    2. the backoffice role matrix (`GET /access/modules`),
 *    3. the boot-time route coverage assertion (AccessCoverageService).
 *
 *  A permission key is always `<module>.<action>`.
 * ═══════════════════════════════════════════════════════════════
 */

export type AccessLevel = 'none' | 'read' | 'user' | 'manager';

/** Levels that actually grant something, in ascending order of power. */
export const GRANTING_LEVELS = ['read', 'user', 'manager'] as const;
export type GrantingLevel = (typeof GRANTING_LEVELS)[number];

export const ACCESS_LEVELS: readonly AccessLevel[] = [
  'none',
  ...GRANTING_LEVELS,
] as const;

export interface AccessCategoryDef {
  key: string;
  label: string;
  /** Display order in the role matrix. */
  order: number;
}

export interface AccessActionDef {
  key: string;
  label: string;
  description: string;
}

export interface AccessModuleDef {
  key: string;
  category: string;
  label: string;
  description: string;
  actions: AccessActionDef[];
  /** Action keys granted by each level. `manager` is always every action. */
  levels: Record<GrantingLevel, string[]>;
}

// ─────────────────────────────────────────────────────────────
//  Categories
// ─────────────────────────────────────────────────────────────

export const ACCESS_CATEGORIES: AccessCategoryDef[] = [
  { key: 'general', label: 'General', order: 10 },
  { key: 'sales', label: 'Sales', order: 20 },
  { key: 'purchases', label: 'Purchases', order: 30 },
  { key: 'accounting', label: 'Accounting', order: 40 },
  { key: 'catalog', label: 'Catalog', order: 50 },
  { key: 'contacts', label: 'Contacts', order: 60 },
  { key: 'inventory', label: 'Inventory', order: 70 },
  { key: 'delivery', label: 'Delivery', order: 80 },
  { key: 'reporting', label: 'Reporting', order: 90 },
  { key: 'tools', label: 'Tools', order: 100 },
  { key: 'settings', label: 'Administration', order: 110 },
];

// ─────────────────────────────────────────────────────────────
//  Action vocabulary
// ─────────────────────────────────────────────────────────────

/**
 * Shared labels so that `products.create` and `invoices.create` read the same
 * way in every language file and in the role matrix.
 */
const ACTION_VOCABULARY: Record<
  string,
  { label: string; description: string }
> = {
  view: { label: 'View', description: 'List and open records' },
  create: { label: 'Create', description: 'Create new records' },
  edit: { label: 'Edit', description: 'Modify existing records' },
  delete: { label: 'Delete', description: 'Permanently remove records' },
  export: { label: 'Export', description: 'Download data and PDF documents' },
  import: { label: 'Import', description: 'Bulk import records' },
  validate: {
    label: 'Validate',
    description: 'Confirm a document and move it out of draft',
  },
  cancel: { label: 'Cancel', description: 'Cancel a confirmed document' },
  convert: {
    label: 'Convert',
    description: 'Convert a document into the next document in the flow',
  },
  adjust: { label: 'Adjust', description: 'Record stock adjustments' },
  transfer: {
    label: 'Transfer',
    description: 'Move stock between warehouses',
  },
  assign: { label: 'Assign', description: 'Assign work to a team member' },
  upload: { label: 'Upload', description: 'Upload new files' },
  share: { label: 'Share', description: 'Share files with other users' },
  send: { label: 'Send', description: 'Send messages and notifications' },
  manage: { label: 'Manage', description: 'Full administrative control' },
  use: { label: 'Use', description: 'Operate the module day to day' },
  discount: { label: 'Apply discounts', description: 'Grant manual discounts' },
  refund: { label: 'Refund', description: 'Issue refunds' },
  generate: { label: 'Generate', description: 'Generate documents' },
  print: { label: 'Print', description: 'Send documents to a printer' },
  open: { label: 'Open session', description: 'Open a cash session' },
  close: { label: 'Close session', description: 'Close and settle a session' },
};

function action(key: string): AccessActionDef {
  const vocab = ACTION_VOCABULARY[key];
  if (!vocab) {
    throw new Error(
      `Unknown access action "${key}". Add it to ACTION_VOCABULARY first.`,
    );
  }
  return { key, label: vocab.label, description: vocab.description };
}

interface ModuleInput {
  key: string;
  category: string;
  label: string;
  description: string;
  actions: string[];
  /** Actions granted at `read`. Defaults to `['view']` when present. */
  read?: string[];
  /** Actions granted at `user`. Defaults to read + create/edit/export/import. */
  user?: string[];
}

function defineModule(input: ModuleInput): AccessModuleDef {
  const all = input.actions;
  const duplicates = all.filter((a, i) => all.indexOf(a) !== i);
  if (duplicates.length) {
    throw new Error(
      `Module "${input.key}" declares duplicate actions: ${duplicates.join(', ')}`,
    );
  }

  const read = input.read ?? all.filter((a) => a === 'view');
  const user =
    input.user ??
    all.filter((a) =>
      ['view', 'create', 'edit', 'export', 'import'].includes(a),
    );

  for (const [levelName, actions] of [
    ['read', read],
    ['user', user],
  ] as const) {
    const unknown = actions.filter((a) => !all.includes(a));
    if (unknown.length) {
      throw new Error(
        `Module "${input.key}" level "${levelName}" references actions not declared on the module: ${unknown.join(', ')}`,
      );
    }
  }

  return {
    key: input.key,
    category: input.category,
    label: input.label,
    description: input.description,
    actions: all.map(action),
    levels: {
      read,
      // `user` always subsumes `read`, `manager` always subsumes everything.
      user: all.filter((a) => read.includes(a) || user.includes(a)),
      manager: [...all],
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  Modules
// ─────────────────────────────────────────────────────────────

export const ACCESS_MODULES: AccessModuleDef[] = [
  // ── General ────────────────────────────────────────────────
  defineModule({
    key: 'dashboard',
    category: 'general',
    label: 'Dashboard',
    description: 'Home dashboard and headline statistics',
    actions: ['view', 'export'],
    read: ['view'],
    user: ['view', 'export'],
  }),

  // ── Sales ──────────────────────────────────────────────────
  defineModule({
    key: 'orders',
    category: 'sales',
    label: 'Sales Orders',
    description: 'Customer orders and their payment lines',
    actions: [
      'view',
      'create',
      'edit',
      'delete',
      'validate',
      'cancel',
      'export',
    ],
    user: ['view', 'create', 'edit', 'validate', 'export'],
  }),
  defineModule({
    key: 'quotes',
    category: 'sales',
    label: 'Quotes',
    description: 'Sales and purchase quotations',
    actions: [
      'view',
      'create',
      'edit',
      'delete',
      'validate',
      'convert',
      'export',
    ],
    user: ['view', 'create', 'edit', 'validate', 'convert', 'export'],
  }),
  defineModule({
    key: 'pos',
    category: 'sales',
    label: 'Point of Sale',
    description: 'Point of Sale terminal',
    actions: ['use', 'discount', 'refund'],
    read: [],
    user: ['use'],
  }),
  defineModule({
    key: 'caisse',
    category: 'sales',
    label: 'Cash Register',
    description: 'Cash sessions and till reconciliation',
    actions: ['view', 'open', 'close', 'manage'],
    read: ['view'],
    user: ['view', 'open', 'close'],
  }),

  // NOTE ON PURCHASES. Orders, quotes and invoices share one controller for
  // both directions — a document is a purchase or a sale by virtue of a column,
  // not of its endpoint. Splitting access along that axis is a record rule, and
  // record rules are deliberately out of scope here, so `orders` / `quotes` /
  // `invoices` govern both directions. Purchasing is still separable through
  // the reporting modules below, which do have their own controllers.

  // ── Accounting ─────────────────────────────────────────────
  defineModule({
    key: 'invoices',
    category: 'accounting',
    label: 'Customer Invoices',
    description: 'Sales invoices and credit notes',
    actions: [
      'view',
      'create',
      'edit',
      'delete',
      'validate',
      'cancel',
      'export',
    ],
    user: ['view', 'create', 'edit', 'export'],
  }),
  defineModule({
    key: 'payments',
    category: 'accounting',
    label: 'Payments',
    description: 'Customer and supplier payments',
    actions: ['view', 'create', 'edit', 'delete', 'validate', 'export'],
    user: ['view', 'create', 'edit', 'export'],
  }),

  // ── Catalog ────────────────────────────────────────────────
  defineModule({
    key: 'products',
    category: 'catalog',
    label: 'Products',
    description: 'Product catalogue, pricing and variants',
    actions: ['view', 'create', 'edit', 'delete', 'import', 'export'],
  }),
  defineModule({
    key: 'categories',
    category: 'catalog',
    label: 'Categories',
    description: 'Product categories',
    actions: ['view', 'create', 'edit', 'delete'],
  }),
  defineModule({
    key: 'brands',
    category: 'catalog',
    label: 'Brands',
    description: 'Product brands',
    actions: ['view', 'create', 'edit', 'delete'],
  }),

  // ── Contacts ───────────────────────────────────────────────
  defineModule({
    key: 'partners',
    category: 'contacts',
    label: 'Customers & Suppliers',
    description: 'Partner records, addresses and contacts',
    actions: ['view', 'create', 'edit', 'delete', 'import', 'export'],
  }),

  // ── Inventory ──────────────────────────────────────────────
  defineModule({
    key: 'stock',
    category: 'inventory',
    label: 'Stock',
    description: 'Stock levels, movements and adjustments',
    actions: ['view', 'adjust', 'transfer', 'export'],
    read: ['view'],
    user: ['view', 'transfer', 'export'],
  }),
  defineModule({
    key: 'warehouses',
    category: 'inventory',
    label: 'Warehouses',
    description: 'Warehouses and storage locations',
    actions: ['view', 'create', 'edit', 'delete'],
  }),
  defineModule({
    key: 'uom',
    category: 'inventory',
    label: 'Units of Measure',
    description: 'Units of measure and conversions',
    actions: ['view', 'create', 'edit', 'delete'],
  }),

  // ── Delivery ───────────────────────────────────────────────
  defineModule({
    key: 'delivery',
    category: 'delivery',
    label: 'Delivery',
    description: 'Delivery people, rounds and delivery notes',
    actions: ['view', 'create', 'edit', 'delete', 'assign'],
    user: ['view', 'create', 'edit', 'assign'],
  }),

  // ── Reporting ──────────────────────────────────────────────
  ...(
    [
      ['reports_sales', 'Sales Reports', 'Sales journals and revenue analysis'],
      [
        'reports_purchases',
        'Purchase Reports',
        'Purchase journals and supplier spend',
      ],
      [
        'reports_invoices',
        'Invoice Reports',
        'Invoice ageing, outstanding balances and VAT',
      ],
      [
        'reports_payments',
        'Payment Reports',
        'Cashflow, in/out flow and payment methods',
      ],
      [
        'reports_clients',
        'Client Reports',
        'Client statements, ageing and top clients',
      ],
      [
        'reports_suppliers',
        'Supplier Reports',
        'Supplier statements and ageing',
      ],
      [
        'reports_products',
        'Product Reports',
        'Margin analysis and product performance',
      ],
      [
        'reports_stock',
        'Stock Reports',
        'Stock valuation and movement history',
      ],
    ] as const
  ).map(([key, label, description]) =>
    defineModule({
      key,
      category: 'reporting',
      label,
      description,
      actions: ['view', 'export'],
      read: ['view'],
      user: ['view', 'export'],
    }),
  ),

  // ── Tools ──────────────────────────────────────────────────
  defineModule({
    key: 'drive',
    category: 'tools',
    label: 'Drive',
    description: 'Shared document storage',
    actions: ['view', 'upload', 'edit', 'delete', 'share'],
    read: ['view'],
    user: ['view', 'upload', 'edit', 'share'],
  }),
  defineModule({
    key: 'images',
    category: 'tools',
    label: 'Images',
    description: 'Image library used by products and documents',
    actions: ['view', 'upload', 'delete'],
    read: ['view'],
    user: ['view', 'upload'],
  }),
  defineModule({
    key: 'documents',
    category: 'tools',
    label: 'Document Generation',
    description: 'PDF rendering for quotes, orders and invoices',
    actions: ['generate'],
    read: [],
    user: ['generate'],
  }),
  defineModule({
    key: 'bulk',
    category: 'tools',
    label: 'Bulk Operations',
    description: 'Bulk import and export across modules',
    actions: ['import', 'export'],
    read: [],
    user: ['export'],
  }),
  defineModule({
    key: 'notifications',
    category: 'tools',
    label: 'Notifications',
    description: 'In-app notifications and templates',
    actions: ['view', 'send', 'manage'],
    read: ['view'],
    user: ['view', 'send'],
  }),

  // ── Administration ─────────────────────────────────────────
  defineModule({
    key: 'configurations',
    category: 'settings',
    label: 'Settings',
    description: 'Company settings, taxes, currencies and payment terms',
    actions: ['view', 'edit'],
    read: ['view'],
    user: ['view'],
  }),
  defineModule({
    key: 'sequences',
    category: 'settings',
    label: 'Document Sequences',
    description: 'Numbering sequences for every document type',
    actions: ['view', 'create', 'edit', 'delete'],
    user: ['view'],
  }),
  defineModule({
    key: 'printers',
    category: 'settings',
    label: 'Printers',
    description: 'Printers and print jobs',
    actions: ['view', 'create', 'edit', 'delete', 'print'],
    read: ['view'],
    user: ['view', 'print'],
  }),
  defineModule({
    key: 'users',
    category: 'settings',
    label: 'Users',
    description: 'Backoffice and portal user accounts',
    actions: ['view', 'create', 'edit', 'delete'],
    user: ['view'],
  }),
  defineModule({
    key: 'roles',
    category: 'settings',
    label: 'Roles & Permissions',
    description: 'Access groups, permissions and role assignment',
    actions: ['view', 'create', 'edit', 'delete'],
    user: ['view'],
  }),
];

// ─────────────────────────────────────────────────────────────
//  Derived lookups
// ─────────────────────────────────────────────────────────────

export const ACCESS_MODULE_BY_KEY: ReadonlyMap<string, AccessModuleDef> =
  new Map(ACCESS_MODULES.map((m) => [m.key, m]));

/** Every valid permission key, e.g. `invoices.create`. */
export const ALL_PERMISSION_KEYS: readonly string[] = ACCESS_MODULES.flatMap(
  (m) => m.actions.map((a) => `${m.key}.${a.key}`),
);

const PERMISSION_KEY_SET = new Set(ALL_PERMISSION_KEYS);

export function isKnownPermissionKey(key: string): boolean {
  return PERMISSION_KEY_SET.has(key);
}

export function permissionKey(moduleKey: string, actionKey: string): string {
  return `${moduleKey}.${actionKey}`;
}

/** Permission keys granted by a level on a module. `none` grants nothing. */
export function permissionsForLevel(
  moduleKey: string,
  level: AccessLevel,
): string[] {
  if (level === 'none') return [];
  const mod = ACCESS_MODULE_BY_KEY.get(moduleKey);
  if (!mod) return [];
  return mod.levels[level].map((a) => permissionKey(moduleKey, a));
}

/**
 * Reverse of `permissionsForLevel`: given the permission keys a role holds,
 * report the level to display for a module, or `custom` when the set matches
 * no bundle exactly. Mirrors how Odoo renders a partially-customised group.
 */
export function levelForPermissions(
  moduleKey: string,
  heldKeys: Iterable<string>,
): AccessLevel | 'custom' {
  const mod = ACCESS_MODULE_BY_KEY.get(moduleKey);
  if (!mod) return 'none';

  const prefix = `${moduleKey}.`;
  const held = new Set(
    [...heldKeys].filter(
      (k) => k.startsWith(prefix) && isKnownPermissionKey(k),
    ),
  );

  if (held.size === 0) return 'none';

  for (const level of GRANTING_LEVELS) {
    const bundle = permissionsForLevel(moduleKey, level);
    if (bundle.length === held.size && bundle.every((k) => held.has(k))) {
      return level;
    }
  }
  return 'custom';
}

/** Seed rows for the `permissions` table, derived from the registry. */
export interface PermissionCatalogueEntry {
  key: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

export function buildPermissionCatalogue(): PermissionCatalogueEntry[] {
  return ACCESS_MODULES.flatMap((mod) =>
    mod.actions.map((act) => ({
      key: permissionKey(mod.key, act.key),
      name: `${act.label} — ${mod.label}`,
      description: `${act.description} in ${mod.label}.`,
      module: mod.key,
      action: act.key,
    })),
  );
}

/** Every reporting module's view / export key, for endpoints that span them. */
export const REPORT_VIEW_PERMISSIONS: string[] = ACCESS_MODULES.filter(
  (m) => m.category === 'reporting',
).map((m) => permissionKey(m.key, 'view'));

export const REPORT_EXPORT_PERMISSIONS: string[] = ACCESS_MODULES.filter(
  (m) => m.category === 'reporting',
).map((m) => permissionKey(m.key, 'export'));
