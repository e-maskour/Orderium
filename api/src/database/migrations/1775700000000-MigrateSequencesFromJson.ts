import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time data migration: moves sequence configuration from the
 * `configurations` JSON blob (entity = 'sequences') into the dedicated
 * `sequences` relational table.
 *
 * Safe to re-run — uses INSERT … ON CONFLICT DO NOTHING.
 *
 * What this migration fixes:
 *  - Strips escaped quotes: "Factures d\\'achat" → "Factures d'achat"
 *  - Trims whitespace from prefixes: 'DV ' → 'DV'
 *  - Enforces zero-padded month/day in period keys consistently
 *  - Removes stale computed fields (nextDocumentNumber, realTimeNextNumber)
 *  - Sets current_period_key based on today + each sequence's resetPeriod
 */
export class MigrateSequencesFromJson1775700000000 implements MigrationInterface {
  name = 'MigrateSequencesFromJson1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read the sequences JSON from configurations table
    const rows: Array<{ id: number; values: Record<string, unknown> }> =
      await queryRunner.query(
        `SELECT id, values FROM configurations WHERE entity = 'sequences'`,
      );

    if (!rows.length) {
      console.log(
        '[MigrateSequences] No configurations.sequences row found — skipping data migration.',
      );
      return;
    }

    const now = new Date();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const seqArray = (row.values?.sequences ?? []) as Array<
        Record<string, unknown>
      >;
      if (!Array.isArray(seqArray)) continue;

      for (const seq of seqArray) {
        const entityType = (seq.entityType as string) ?? '';
        if (!entityType) continue;

        const resetPeriod = (seq.resetPeriod as string) ?? 'yearly';
        const currentPeriodKey = computePeriodKey(resetPeriod, now);

        // Fix escaped quotes and trim whitespace from name/prefix
        const rawName = (seq.name as string) ?? entityType;
        const name = rawName.replace(/\\'/g, "'").replace(/\\"/g, '"');
        const prefix = ((seq.prefix as string) ?? '').trim();
        const suffix = ((seq.suffix as string) ?? '').trim();
        const numberLength = (seq.numberLength as number) ?? 4;
        const yearInFormat = (seq.yearInPrefix as boolean) ?? true;
        const monthInFormat = (seq.monthInPrefix as boolean) ?? true;
        const dayInFormat = (seq.dayInPrefix as boolean) ?? false;
        const trimesterInFormat = (seq.trimesterInPrefix as boolean) ?? false;
        const nextNumber = (seq.nextNumber as number) ?? 1;
        const isActive = (seq.isActive as boolean) ?? true;

        // Build formatTemplate
        const formatTemplate = buildFormatTemplate({
          prefix,
          suffix,
          numberLength,
          yearInFormat,
          monthInFormat,
          dayInFormat,
          trimesterInFormat,
        });

        await queryRunner.query(
          `INSERT INTO sequences (
            entity_type, name, prefix, suffix, number_length,
            year_in_format, month_in_format, day_in_format, trimester_in_format,
            format_template, reset_period, current_period_key,
            next_number, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          ON CONFLICT (entity_type) DO NOTHING`,
          [
            entityType,
            name,
            prefix,
            suffix,
            numberLength,
            yearInFormat,
            monthInFormat,
            dayInFormat,
            trimesterInFormat,
            formatTemplate,
            resetPeriod,
            currentPeriodKey,
            nextNumber,
            isActive,
          ],
        );

        migratedCount++;
      }

      console.log(
        `[MigrateSequences] Migrated ${migratedCount} sequences, skipped ${skippedCount} (already existed).`,
      );
    }

    // Insert any missing default sequences (new types not in the JSON)
    const defaults = getDefaultSequences(now);
    for (const def of defaults) {
      const existing: Array<{ entity_type: string }> = await queryRunner.query(
        `SELECT entity_type FROM sequences WHERE entity_type = $1`,
        [def.entityType],
      );
      if (!existing.length) {
        await queryRunner.query(
          `INSERT INTO sequences (
            entity_type, name, prefix, suffix, number_length,
            year_in_format, month_in_format, day_in_format, trimester_in_format,
            format_template, reset_period, current_period_key,
            next_number, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
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
            def.currentPeriodKey,
            def.nextNumber,
            def.isActive,
          ],
        );
        console.log(
          `[MigrateSequences] Inserted missing default sequence: ${def.entityType}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The data migration is lossy in reverse — we just clear the sequences table.
    // The original JSON in configurations is preserved (we never deleted it).
    await queryRunner.query(`DELETE FROM sequences`);
    console.log(
      '[MigrateSequences] Rolled back: deleted all rows from sequences table.',
    );
  }
}

// ─── Pure helpers (inlined to keep migration self-contained) ──────────────────

function computePeriodKey(resetPeriod: string, date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');

  switch (resetPeriod) {
    case 'daily':
      return `${y}-${m}-${d}`;
    case 'monthly':
      return `${y}-${m}`;
    case 'yearly':
      return y;
    case 'never':
      return 'NEVER';
    default:
      return y;
  }
}

function buildFormatTemplate(opts: {
  prefix: string;
  suffix: string;
  numberLength: number;
  yearInFormat: boolean;
  monthInFormat: boolean;
  dayInFormat: boolean;
  trimesterInFormat: boolean;
}): string {
  const parts: string[] = [];
  if (opts.prefix) parts.push(opts.prefix);
  if (opts.yearInFormat) parts.push('YYYY');
  if (opts.trimesterInFormat) {
    parts.push('QQ');
  } else if (opts.monthInFormat) {
    parts.push('MM');
  }
  if (opts.dayInFormat) parts.push('DD');
  parts.push('X'.repeat(opts.numberLength || 4));
  if (opts.suffix) parts.push(opts.suffix);
  return parts.join('-');
}

interface DefaultSeq {
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
  currentPeriodKey: string;
  nextNumber: number;
  isActive: boolean;
}

function getDefaultSequences(now: Date): DefaultSeq[] {
  const make = (
    entityType: string,
    name: string,
    prefix: string,
    resetPeriod: string,
    opts: Partial<{
      dayInFormat: boolean;
      trimesterInFormat: boolean;
      monthInFormat: boolean;
    }> = {},
  ): DefaultSeq => {
    const yearInFormat = true;
    const monthInFormat = opts.monthInFormat ?? true;
    const dayInFormat = opts.dayInFormat ?? false;
    const trimesterInFormat = opts.trimesterInFormat ?? false;
    const numberLength = 4;
    const suffix = '';
    return {
      entityType,
      name,
      prefix,
      suffix,
      numberLength,
      yearInFormat,
      monthInFormat,
      dayInFormat,
      trimesterInFormat,
      formatTemplate: buildFormatTemplate({
        prefix,
        suffix,
        numberLength,
        yearInFormat,
        monthInFormat,
        dayInFormat,
        trimesterInFormat,
      }),
      resetPeriod,
      currentPeriodKey: computePeriodKey(resetPeriod, now),
      nextNumber: 1,
      isActive: true,
    };
  };

  return [
    make('invoice_sale', 'Factures de vente', 'FA', 'monthly'),
    make('invoice_purchase', "Factures d'achat", 'PA', 'yearly'),
    make('quote', 'Devis', 'DV', 'yearly'),
    make('delivery_note', 'Bons de livraison', 'BL', 'yearly'),
    make('purchase_order', "Bons d'achat", 'BA', 'yearly'),
    make('payment', 'Paiements', 'PAY', 'yearly'),
    make('receipt', 'Reçu', '', 'daily', { dayInFormat: true }),
    make('order', 'Commandes POS', 'CMD', 'yearly'),
    make('price_request', 'Demandes de prix', 'DP', 'yearly'),
  ];
}
