import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a dedicated orderNumber column to the orders table.
 *
 * Column semantics after this migration:
 *
 *  ┌──────────────────┬──────────────────────────────────────────────────────┐
 *  │ Column           │ Purpose                                              │
 *  ├──────────────────┼──────────────────────────────────────────────────────┤
 *  │ document_number  │ BACKOFFICE orders — BL-xxx / BA-xxx / PROV-xxx       │
 *  │ orderNumber      │ CLIENT_POS / ADMIN_POS orders — CMD-xxx              │
 *  │ receipt_number   │ POS receipt — populated alongside orderNumber        │
 *  └──────────────────┴──────────────────────────────────────────────────────┘
 *
 * Existing CLIENT_POS/ADMIN_POS rows are back-filled from document_number.
 * A partial unique index ensures uniqueness only on non-NULL values.
 */
export class AddOrderNumber1775500000000 implements MigrationInterface {
  name = 'AddOrderNumber1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Add column ─────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS "orderNumber" VARCHAR(100) NULL
    `);

    // ── 2. Back-fill from document_number for POS orders ─────────────────
    await queryRunner.query(`
      UPDATE orders
         SET "orderNumber" = "documentNumber"
       WHERE "originType" IN ('CLIENT_POS', 'ADMIN_POS')
         AND "documentNumber" IS NOT NULL
         AND "documentNumber" NOT LIKE 'PROV%'
    `);

    // ── 3. Indexes ────────────────────────────────────────────────────────
    // Regular index for fast look-up queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_orderNumber"
        ON orders ("orderNumber")
    `);

    // Partial unique index — enforces uniqueness only on non-NULL values so
    // BACKOFFICE rows (where orderNumber IS NULL) are never rejected.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_orders_orderNumber"
        ON orders ("orderNumber")
       WHERE "orderNumber" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_orders_orderNumber"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_orderNumber"`);
    await queryRunner.query(`
      ALTER TABLE orders
        DROP COLUMN IF EXISTS "orderNumber"
    `);
  }
}
