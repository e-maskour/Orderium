import { EntityManager, In } from 'typeorm';
import { Configuration } from '../../modules/configurations/entities/configuration.entity';
import { Warehouse } from '../../modules/inventory/entities/warehouse.entity';
import { SeederDefinition } from './seeder.types';
import { DEFAULT_WAREHOUSE } from './warehouse.seeder';
import {
  GENERAL_DEFAULTS,
  GENERAL_ENTITY,
} from '../../modules/configurations/general-params.constants';

const DEFAULT_CONFIGURATIONS = [
  {
    entity: 'taxes',
    values: {
      defaultRate: 20,
      rates: [
        { name: 'Taux Normal', rate: 20, isDefault: true },
        { name: 'Taux Intermédiaire', rate: 14, isDefault: false },
        { name: 'Taux Réduit', rate: 10, isDefault: false },
        { name: 'Taux Super Réduit', rate: 7, isDefault: false },
        { name: 'Taux Zéro', rate: 0, isDefault: false },
      ],
    },
  },
  {
    entity: 'currencies',
    values: {
      default: 'MAD',
      currencies: [
        {
          code: 'MAD',
          name: 'Moroccan Dirham',
          symbol: 'DH',
          isDefault: true,
        },
        { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
        { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
      ],
    },
  },
  {
    entity: 'payment_terms',
    values: {
      default: 'immediate',
      terms: [
        { key: 'immediate', label: 'Immediate', days: 0, isDefault: true },
        { key: 'net_15', label: 'Net 15', days: 15, isDefault: false },
        { key: 'net_30', label: 'Net 30', days: 30, isDefault: false },
        { key: 'net_60', label: 'Net 60', days: 60, isDefault: false },
      ],
    },
  },
  {
    entity: 'my_company',
    values: {
      companyName: 'POS',
      address: '',
      zipCode: '40000',
      city: 'Marrakech',
      country: 'Maroc',
      state: 'Marrakech-Safi',
      phone: '',
      fax: '',
      email: '',
      website: '',
      logo: '',
      professions: '',
      vatNumber: '',
      ice: '',
      taxId: '',
      registrationNumber: '',
      legalStructure: '',
      capital: 0,
      fiscalYearStartMonth: 1,
    },
  },
  {
    entity: GENERAL_ENTITY,
    values: { ...GENERAL_DEFAULTS } as Record<string, unknown>,
  },
];

const INVENTORY_ENTITY = 'inventory';

/**
 * Stock moves on order validation, not on invoice validation: the bon de
 * livraison / bon d'achat is what physically shifts goods, so that is the
 * default trigger a fresh tenant gets.
 *
 * `defaultWarehouseId` is left null here and resolved at run time — it points
 * at the depot created by the warehouses seeder, whose id is only known once
 * that seeder has run.
 */
const INVENTORY_DEFAULTS: Record<string, unknown> = {
  defaultWarehouseId: null,
  incrementStockOnInvoiceAchat: false,
  decrementStockOnInvoiceVente: false,
  incrementStockOnOrderAchat: true,
  decrementStockOnOrderVente: true,
};

/** Configuration groups this seeder owns. Exported so callers can evict their
 * cache entries after a run — the seeder writes through an EntityManager and
 * never passes through ConfigurationsService. */
export const CONFIG_ENTITIES = [
  ...DEFAULT_CONFIGURATIONS.map((c) => c.entity),
  INVENTORY_ENTITY,
];

const STOCK_TRIGGER_KEYS = [
  'incrementStockOnInvoiceAchat',
  'decrementStockOnInvoiceVente',
  'incrementStockOnOrderAchat',
  'decrementStockOnOrderVente',
];

/** Id of the depot the warehouses seeder declares, or null if absent. */
async function seededWarehouseId(m: EntityManager): Promise<number | null> {
  const warehouse = await m.getRepository(Warehouse).findOne({
    where: { code: DEFAULT_WAREHOUSE.code },
    select: { id: true },
  });
  return warehouse?.id ?? null;
}

/**
 * What an existing inventory config is still missing, as a patch to merge.
 *
 * Only blanks are filled: a tenant that picked its own warehouse, or that
 * chose invoice-triggered stock, keeps that choice. But a config where no
 * trigger at all is set has never been configured — earlier versions of
 * `ConfigurationsService` created it that way — so it gets the order-based
 * defaults.
 */
function inventoryGaps(
  values: Record<string, unknown> | null | undefined,
  warehouseId: number | null,
): { patch: Record<string, unknown>; reasons: string[] } {
  const current = values ?? {};
  const patch: Record<string, unknown> = {};
  const reasons: string[] = [];

  if (warehouseId != null && current.defaultWarehouseId == null) {
    patch.defaultWarehouseId = warehouseId;
    reasons.push(`default warehouse set to ${DEFAULT_WAREHOUSE.code}`);
  }

  if (!STOCK_TRIGGER_KEYS.some((key) => current[key] === true)) {
    for (const key of STOCK_TRIGGER_KEYS) patch[key] = INVENTORY_DEFAULTS[key];
    reasons.push('stock triggers set to order');
  }

  return { patch, reasons };
}

export const configurationsSeeder: SeederDefinition = {
  key: 'configurations',
  name: 'Configurations',
  description:
    'Installs default tax rates, currencies, payment terms, company details ' +
    'and inventory settings (stock moves on order, default depot).',

  async check(m: EntityManager) {
    const repo = m.getRepository(Configuration);
    const present = await repo.findBy({ entity: In(CONFIG_ENTITIES) });
    const absent = CONFIG_ENTITIES.length - present.length;

    // A half-configured inventory group counts as missing too: without a
    // warehouse the stock hooks in orders/invoices bail out, and without a
    // trigger they never fire at all.
    const inventory = present.find((c) => c.entity === INVENTORY_ENTITY);
    const gaps = inventory
      ? inventoryGaps(inventory.values, await seededWarehouseId(m))
      : { patch: {}, reasons: [] };
    const incomplete = gaps.reasons.length ? 1 : 0;

    const parts: string[] = [];
    if (absent) {
      parts.push(
        `${absent} of ${CONFIG_ENTITIES.length} configuration groups missing`,
      );
    }
    if (incomplete) parts.push(`inventory: ${gaps.reasons.join(', ')} pending`);

    const missing = absent + incomplete;
    return {
      missing,
      detail: missing
        ? parts.join('; ')
        : `All ${CONFIG_ENTITIES.length} configuration groups present`,
    };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(Configuration);
    const existing = await repo.findBy({ entity: In(CONFIG_ENTITIES) });
    const have = new Set(existing.map((c) => c.entity));

    let created = 0;
    for (const config of DEFAULT_CONFIGURATIONS) {
      if (have.has(config.entity)) continue;
      await repo.save(repo.create(config));
      created++;
    }

    const warehouseId = await seededWarehouseId(m);
    const inventory = existing.find((c) => c.entity === INVENTORY_ENTITY);
    let repaired: string[] = [];

    if (!inventory) {
      await repo.save(
        repo.create({
          entity: INVENTORY_ENTITY,
          values: { ...INVENTORY_DEFAULTS, defaultWarehouseId: warehouseId },
        }),
      );
      created++;
    } else {
      const { patch, reasons } = inventoryGaps(inventory.values, warehouseId);
      if (reasons.length) {
        inventory.values = { ...inventory.values, ...patch };
        await repo.save(inventory);
        repaired = reasons;
      }
    }

    const detail = [
      `${created} created, ${CONFIG_ENTITIES.length - created} already present`,
      repaired.length ? `inventory: ${repaired.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    return { created, pruned: 0, detail };
  },
};
