/**
 * ═══════════════════════════════════════════════════════════════
 *  MOROCOM — Preset Roles
 * ═══════════════════════════════════════════════════════════════
 *
 *  The equivalent of Odoo's data-defined `res.groups`: a ladder of roles
 *  seeded into every tenant, wired together with implications so that
 *  "Sales Manager" automatically grants everything "Sales User" grants.
 *
 *  A preset declares only its OWN increment of permissions. Everything it
 *  inherits comes from `implies` and is expanded at resolution time by
 *  `AccessControlService`, exactly as Odoo expands `implied_ids`.
 *
 *  Presets are seeded with `isSystem: true`: they cannot be renamed or
 *  deleted, but their permission sets remain editable so a tenant can adapt
 *  them without inventing a parallel hierarchy.
 * ═══════════════════════════════════════════════════════════════
 */

import {
  AccessLevel,
  ACCESS_MODULES,
  permissionsForLevel,
} from './access-modules';

export interface RolePresetDef {
  /** Stable identifier, also the role name. */
  name: string;
  description: string;
  category: string;
  isSuperAdmin?: boolean;
  /** Names of roles whose rights this role also grants. */
  implies?: string[];
  /** Per-module access level for this role's own increment. */
  modules?: Record<string, AccessLevel>;
  /** Individual permission keys on top of the level bundles. */
  extraPermissions?: string[];
}

/** Every tenant gets this role; the first admin is assigned to it. */
export const ADMINISTRATOR_ROLE = 'administrator';

/**
 * Legacy name of the administrator role. Tenants provisioned before the
 * access-control rollout have this instead; the sync renames rather than
 * duplicates it.
 */
export const LEGACY_SUPER_ADMIN_ROLE = 'super_admin';

export const ROLE_PRESETS: RolePresetDef[] = [
  {
    name: ADMINISTRATOR_ROLE,
    description: 'Full access to every module — bypasses all permission checks',
    category: 'settings',
    isSuperAdmin: true,
    // The bypass alone already grants everything, but a role that stores no
    // permission reads as "no access" in the role matrix — a module added
    // after the role was seeded (payments, say) simply never appears on it.
    // Holding the whole catalogue keeps the stored set honest about what the
    // guard actually allows.
    modules: Object.fromEntries(
      ACCESS_MODULES.map((m) => [m.key, 'manager' as AccessLevel]),
    ),
  },

  // ── Sales ladder ───────────────────────────────────────────
  {
    name: 'sales_read',
    description: 'Read-only visibility over the sales pipeline',
    category: 'sales',
    modules: {
      dashboard: 'read',
      orders: 'read',
      quotes: 'read',
      partners: 'read',
      products: 'read',
    },
  },
  {
    name: 'sales_user',
    description: 'Create and manage own sales documents',
    category: 'sales',
    implies: ['sales_read'],
    modules: {
      orders: 'user',
      quotes: 'user',
      partners: 'user',
      stock: 'read',
      caisse: 'read',
    },
    extraPermissions: ['documents.generate'],
  },
  {
    name: 'sales_manager',
    description: 'Full control over sales, including deletion and reporting',
    category: 'sales',
    implies: ['sales_user'],
    modules: {
      orders: 'manager',
      quotes: 'manager',
      partners: 'manager',
      reports_sales: 'manager',
      reports_clients: 'manager',
      bulk: 'manager',
    },
  },

  // ── Purchases ladder ───────────────────────────────────────
  {
    name: 'purchase_user',
    description: 'Raise and follow up supplier orders',
    category: 'purchases',
    modules: {
      dashboard: 'read',
      quotes: 'user',
      orders: 'user',
      invoices: 'user',
      partners: 'read',
      products: 'read',
      stock: 'read',
    },
    extraPermissions: ['documents.generate'],
  },
  {
    name: 'purchase_manager',
    description: 'Full control over purchasing and supplier reporting',
    category: 'purchases',
    implies: ['purchase_user'],
    modules: {
      quotes: 'manager',
      orders: 'manager',
      invoices: 'manager',
      partners: 'manager',
      reports_purchases: 'manager',
      reports_suppliers: 'manager',
    },
  },

  // ── Accounting ladder ──────────────────────────────────────
  {
    name: 'accounting_user',
    description: 'Record invoices and payments',
    category: 'accounting',
    modules: {
      dashboard: 'read',
      invoices: 'user',
      payments: 'user',
      partners: 'read',
      orders: 'read',
      reports_invoices: 'read',
      reports_payments: 'read',
    },
    extraPermissions: ['documents.generate'],
  },
  {
    name: 'accounting_manager',
    description:
      'Validate and cancel accounting documents, manage numbering and settings',
    category: 'accounting',
    implies: ['accounting_user'],
    modules: {
      invoices: 'manager',
      payments: 'manager',
      reports_invoices: 'manager',
      reports_payments: 'manager',
      reports_clients: 'manager',
      reports_suppliers: 'manager',
      sequences: 'manager',
      configurations: 'manager',
    },
  },

  // ── Inventory ladder ───────────────────────────────────────
  {
    name: 'inventory_user',
    description: 'Handle day-to-day stock movements',
    category: 'inventory',
    modules: {
      dashboard: 'read',
      stock: 'user',
      products: 'read',
      categories: 'read',
      brands: 'read',
      warehouses: 'read',
      uom: 'read',
    },
  },
  {
    name: 'inventory_manager',
    description: 'Full control over stock, the catalogue and warehouses',
    category: 'inventory',
    implies: ['inventory_user'],
    modules: {
      stock: 'manager',
      products: 'manager',
      categories: 'manager',
      brands: 'manager',
      warehouses: 'manager',
      uom: 'manager',
      reports_stock: 'manager',
      reports_products: 'manager',
      bulk: 'manager',
    },
  },

  // ── Operations ─────────────────────────────────────────────
  {
    name: 'pos_operator',
    description: 'Operate the Point of Sale and the cash register',
    category: 'sales',
    modules: {
      dashboard: 'read',
      pos: 'user',
      caisse: 'user',
      orders: 'user',
      partners: 'user',
      products: 'read',
      printers: 'user',
    },
    extraPermissions: ['documents.generate'],
  },
  {
    name: 'delivery_manager',
    description: 'Plan rounds and assign deliveries',
    category: 'delivery',
    modules: {
      dashboard: 'read',
      delivery: 'manager',
      orders: 'read',
      partners: 'read',
    },
    extraPermissions: ['documents.generate'],
  },

  // ── Read-only ──────────────────────────────────────────────
  {
    name: 'readonly',
    description: 'Read-only visibility across every module',
    category: 'general',
    modules: Object.fromEntries(
      ACCESS_MODULES.map((m) => [m.key, 'read' as AccessLevel]),
    ),
  },
];

/** Expand a preset's own increment into concrete permission keys. */
export function permissionsForPreset(preset: RolePresetDef): string[] {
  const keys = new Set<string>(preset.extraPermissions ?? []);
  for (const [moduleKey, level] of Object.entries(preset.modules ?? {})) {
    for (const key of permissionsForLevel(moduleKey, level)) keys.add(key);
  }
  return [...keys].sort();
}
