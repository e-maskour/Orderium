import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds source-document traceability columns to stock_movements:
 *   - source_document_type  (varchar 50, nullable)  — 'order' | 'invoice' | 'manual'
 *   - source_document_id    (int, nullable)          — FK to the originating document
 *
 * Also creates a composite index on (source_document_type, source_document_id)
 * to support efficient idempotency checks and reversal lookups.
 */
export class AddSourceDocumentToStockMovements1775400000000 implements MigrationInterface {
  name = 'AddSourceDocumentToStockMovements1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_movements"
        ADD COLUMN IF NOT EXISTS "sourceDocumentType" varchar(50) NULL,
        ADD COLUMN IF NOT EXISTS "sourceDocumentId"   int         NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_movements_source_doc"
        ON "stock_movements" ("sourceDocumentType", "sourceDocumentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_movements_source_doc"`,
    );

    await queryRunner.query(`
      ALTER TABLE "stock_movements"
        DROP COLUMN IF EXISTS "sourceDocumentType",
        DROP COLUMN IF EXISTS "sourceDocumentId"
    `);
  }
}
