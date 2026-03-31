import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Safely adds shareToken / shareTokenExpiry to orders and invoices.
 *
 * Uses IF NOT EXISTS / DO NOTHING so this is idempotent — safe to run on
 * tenant DBs that may or may not have had the earlier AddShareTokenToOrders
 * migration applied.
 */
export class AddShareTokenColumnsIfNotExists1774619375000
    implements MigrationInterface {
    name = 'AddShareTokenColumnsIfNotExists1774619375000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── orders ──────────────────────────────────────────────────────────────
        await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "shareToken" character varying(100)
    `);

        // Add unique constraint only if no unique constraint exists on the column yet
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_name = kcu.table_name
          WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_name = 'orders'
            AND kcu.column_name = 'shareToken'
        ) THEN
          ALTER TABLE "orders"
            ADD CONSTRAINT "UQ_orders_shareToken" UNIQUE ("shareToken");
        END IF;
      END$$
    `);

        await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "shareTokenExpiry" TIMESTAMP
    `);

        // ── invoices ─────────────────────────────────────────────────────────────
        await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD COLUMN IF NOT EXISTS "shareToken" character varying(100)
    `);

        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_name = kcu.table_name
          WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_name = 'invoices'
            AND kcu.column_name = 'shareToken'
        ) THEN
          ALTER TABLE "invoices"
            ADD CONSTRAINT "UQ_invoices_shareToken" UNIQUE ("shareToken");
        END IF;
      END$$
    `);

        await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD COLUMN IF NOT EXISTS "shareTokenExpiry" TIMESTAMP
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "shareTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "UQ_invoices_shareToken"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "shareToken"`);

        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shareTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_orders_shareToken"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shareToken"`);
    }
}
