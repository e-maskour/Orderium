import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorOrderOriginType1775200000000 implements MigrationInterface {
  name = 'RefactorOrderOriginType1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the new origin_type column with a safe default
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "originType" character varying(50) NOT NULL DEFAULT 'BACKOFFICE'
    `);

    // 2. Migrate existing data based on the old boolean flags:
    //    fromClient = false AND fromPortal = false  → BACKOFFICE
    //    fromClient = true  AND fromPortal = true   → CLIENT_POS
    //    fromClient = false AND fromPortal = true   → ADMIN_POS
    await queryRunner.query(`
      UPDATE "orders"
      SET "originType" = CASE
        WHEN "fromClient" = true  AND "fromPortal" = true  THEN 'CLIENT_POS'
        WHEN "fromClient" = false AND "fromPortal" = true  THEN 'ADMIN_POS'
        ELSE 'BACKOFFICE'
      END
    `);

    // 3. Add a performance index on the new column
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_originType_dateCreated"
      ON "orders" ("originType", "dateCreated" DESC)
    `);

    // 4. Drop the old indexes that reference the deprecated columns
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_fromPortal_dateCreated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_fromClient_dateCreated"`,
    );

    // 5. Drop the deprecated boolean columns
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "fromPortal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "fromClient"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the deprecated columns
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "fromPortal" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "fromClient" boolean NOT NULL DEFAULT false
    `);

    // Restore data from originType back to the boolean flags
    await queryRunner.query(`
      UPDATE "orders"
      SET
        "fromPortal" = CASE WHEN "originType" IN ('CLIENT_POS', 'ADMIN_POS') THEN true ELSE false END,
        "fromClient" = CASE WHEN "originType" = 'CLIENT_POS' THEN true ELSE false END
    `);

    // Restore old indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_fromPortal_dateCreated"
      ON "orders" ("fromPortal", "dateCreated" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_fromClient_dateCreated"
      ON "orders" ("fromClient", "dateCreated" DESC)
    `);

    // Drop the new index and column
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_originType_dateCreated"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "originType"`,
    );
  }
}
