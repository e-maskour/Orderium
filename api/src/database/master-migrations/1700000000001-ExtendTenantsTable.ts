import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds extended tenant profile and lifecycle columns to the `tenants` table.
 * Run with: npm run migration:run:master
 */
export class ExtendTenantsTable1700000000001 implements MigrationInterface {
  name = 'ExtendTenantsTable1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tenants"
                ADD COLUMN IF NOT EXISTS "logoUrl"          VARCHAR(500),
                ADD COLUMN IF NOT EXISTS "primaryColor"     VARCHAR(7),
                ADD COLUMN IF NOT EXISTS "contactEmail"     VARCHAR(255),
                ADD COLUMN IF NOT EXISTS "contactPhone"     VARCHAR(20),
                ADD COLUMN IF NOT EXISTS "address"          TEXT,
                ADD COLUMN IF NOT EXISTS "subscriptionPlan" VARCHAR(50)  NOT NULL DEFAULT 'basic',
                ADD COLUMN IF NOT EXISTS "maxUsers"         INTEGER      NOT NULL DEFAULT 10,
                ADD COLUMN IF NOT EXISTS "disabledAt"       TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS "deletedAt"        TIMESTAMPTZ
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tenants"
                DROP COLUMN IF EXISTS "logoUrl",
                DROP COLUMN IF EXISTS "primaryColor",
                DROP COLUMN IF EXISTS "contactEmail",
                DROP COLUMN IF EXISTS "contactPhone",
                DROP COLUMN IF EXISTS "address",
                DROP COLUMN IF EXISTS "subscriptionPlan",
                DROP COLUMN IF EXISTS "maxUsers",
                DROP COLUMN IF EXISTS "disabledAt",
                DROP COLUMN IF EXISTS "deletedAt"
        `);
  }
}
