import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a dedicated order_number column to the orders table.
 *
 * Column semantics after this migration:
 *
 *  ┌──────────────────┬──────────────────────────────────────────────────────┐
 *  │ Column           │ Purpose                                              │
 *  ├──────────────────┼──────────────────────────────────────────────────────┤
 *  │ document_number  │ BACKOFFICE orders — BL-xxx / BA-xxx / PROV-xxx       │
 *  │ order_number     │ CLIENT_POS / ADMIN_POS orders — CMD-xxx              │
 *  │ receipt_number   │ POS receipt — populated alongside order_number       │
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
        ADD COLUMN IF NOT EXISTS order_number VARCHAR(100) NULL
    `);

    // ── 2. Back-fill from document_number for POS orders ─────────────────
    await queryRunner.query(`
      UPDATE orders
         SET order_number = document_number
       WHERE origin_type IN ('CLIENT_POS', 'ADMIN_POS')
         AND document_number IS NOT NULL
         AND document_number NOT LIKE 'PROV%'
    `);

    // ── 3. Indexes ────────────────────────────────────────────────────────
    // Regular index for fast look-up queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_order_number"
        ON orders (order_number)
    `);

    // Partial unique index — enforces uniqueness only on non-NULL values so
    // BACKOFFICE rows (where order_number IS NULL) are never rejected.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_orders_order_number"
        ON orders (order_number)
       WHERE order_number IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_orders_order_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_order_number"`);
    await queryRunner.query(`
      ALTER TABLE orders
        DROP COLUMN IF EXISTS order_number
    `);
  }
}
