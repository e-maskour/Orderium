import { EntityManager } from 'typeorm';
import { SeederDefinition } from './seeder.types';
import { computeEffectivePeriodKey } from '../../modules/sequences/helpers/compute-period-key';

interface SequenceSeed {
  entityType: string;
  name: string;
  prefix: string;
  suffix: string;
  numberLength: number;
  yearInFormat: boolean;
  monthInFormat: boolean;
  dayInFormat: boolean;
  trimesterInFormat: boolean;
  formatTemplate: string;
  resetPeriod: string;
}

const SEQUENCE_SEEDS: SequenceSeed[] = [
  {
    entityType: 'invoice_sale',
    name: 'Factures de vente',
    prefix: 'FA',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'FA-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'invoice_purchase',
    name: "Factures d'achat",
    prefix: 'PA',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'PA-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'quote',
    name: 'Devis',
    prefix: 'DV',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'DV-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'delivery_note',
    name: 'Bons de livraison',
    prefix: 'BL',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'BL-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'purchase_order',
    name: "Bons d'achat",
    prefix: 'BA',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'BA-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'payment',
    name: 'Paiements',
    prefix: 'PAY',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'PAY-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'receipt',
    name: 'Reçu',
    prefix: '',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: true,
    trimesterInFormat: false,
    formatTemplate: 'YYYY-MM-DD-XXXX',
    resetPeriod: 'daily',
  },
  {
    entityType: 'order',
    name: 'Commandes POS',
    prefix: 'CMD',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'CMD-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
  {
    entityType: 'price_request',
    name: 'Demandes de prix',
    prefix: 'DP',
    suffix: '',
    numberLength: 4,
    yearInFormat: true,
    monthInFormat: true,
    dayInFormat: false,
    trimesterInFormat: false,
    formatTemplate: 'DP-YYYY-MM-XXXX',
    resetPeriod: 'monthly',
  },
];

const SEQUENCE_TYPES = SEQUENCE_SEEDS.map((s) => s.entityType);

export const sequencesSeeder: SeederDefinition = {
  key: 'sequences',
  name: 'Document sequences',
  description:
    'Installs default numbering sequences for invoices, quotes, delivery ' +
    'notes, payments and POS orders.',

  async check(m: EntityManager) {
    const rows: { count: string }[] = await m.query(
      'SELECT count(*)::int AS count FROM sequences WHERE entity_type = ANY($1::text[])',
      [SEQUENCE_TYPES],
    );
    const present = Number(rows[0]?.count ?? 0);
    const missing = SEQUENCE_TYPES.length - present;
    return {
      missing,
      detail: missing
        ? `${missing} of ${SEQUENCE_TYPES.length} sequences missing`
        : `All ${SEQUENCE_TYPES.length} sequences present`,
    };
  },

  async run(m: EntityManager) {
    const now = new Date();
    let created = 0;

    for (const def of SEQUENCE_SEEDS) {
      const currentPeriodKey = computeEffectivePeriodKey(
        def.resetPeriod,
        {
          dayInFormat: def.dayInFormat,
          monthInFormat: def.monthInFormat,
          trimesterInFormat: def.trimesterInFormat,
        },
        now,
      );

      // ON CONFLICT keeps this safe to re-run; RETURNING tells us whether the
      // row was actually inserted, which the previous rowCount probing got
      // wrong for the pg driver's array-shaped result.
      const inserted: unknown[] = await m.query(
        `INSERT INTO sequences (
          entity_type, name, prefix, suffix, number_length,
          year_in_format, month_in_format, day_in_format, trimester_in_format,
          format_template, reset_period, current_period_key,
          next_number, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, true, NOW(), NOW())
        ON CONFLICT (entity_type) DO NOTHING
        RETURNING entity_type`,
        [
          def.entityType,
          def.name,
          def.prefix,
          def.suffix,
          def.numberLength,
          def.yearInFormat,
          def.monthInFormat,
          def.dayInFormat,
          def.trimesterInFormat,
          def.formatTemplate,
          def.resetPeriod,
          currentPeriodKey,
        ],
      );

      if (Array.isArray(inserted) && inserted.length > 0) created++;
    }

    return {
      created,
      pruned: 0,
      detail: `${created} seeded, ${SEQUENCE_TYPES.length - created} already existed`,
    };
  },
};
