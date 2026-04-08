import { DataSource } from 'typeorm';
import { computeEffectivePeriodKey } from '../../modules/sequences/helpers/compute-period-key';
import { buildFormatTemplate } from '../../modules/sequences/helpers/format-document-number';

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

/**
 * Idempotently seeds the `sequences` table with default document-number
 * sequences for a tenant. Uses INSERT … ON CONFLICT DO NOTHING so it is safe
 * to run multiple times.
 */
export async function seedSequences(dataSource: DataSource): Promise<void> {
  console.log('📋 Seeding sequences table...');

  const now = new Date();
  let seeded = 0;
  let skipped = 0;

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

    const result = await dataSource.query(
      `INSERT INTO sequences (
        entity_type, name, prefix, suffix, number_length,
        year_in_format, month_in_format, day_in_format, trimester_in_format,
        format_template, reset_period, current_period_key,
        next_number, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, true, NOW(), NOW())
      ON CONFLICT (entity_type) DO NOTHING`,
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

    const inserted = result?.[1] ?? result?.rowCount ?? 0;
    if (inserted > 0 || (Array.isArray(result) && result[1] > 0)) {
      seeded++;
    } else {
      skipped++;
    }
  }

  console.log(`   ✅ Sequences: ${seeded} seeded, ${skipped} already existed`);
}
