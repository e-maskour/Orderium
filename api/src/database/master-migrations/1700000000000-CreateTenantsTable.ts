import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `tenants` table in `orderium_master`.
 * Run with: npm run migration:run:master
 */
export class CreateTenantsTable1700000000000 implements MigrationInterface {
    name = 'CreateTenantsTable1700000000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"               SERIAL PRIMARY KEY,
        "name"             VARCHAR(100)  NOT NULL,
        "slug"             VARCHAR(50)   NOT NULL,
        "databaseName"     VARCHAR(100)  NOT NULL,
        "databaseHost"     VARCHAR(255)  NOT NULL DEFAULT 'localhost',
        "databasePort"     INTEGER       NOT NULL DEFAULT 5432,
        "isActive"         BOOLEAN       NOT NULL DEFAULT TRUE,
        "logoUrl"          VARCHAR(500)  NULL,
        "primaryColor"     VARCHAR(7)    NULL,
        "contactEmail"     VARCHAR(255)  NULL,
        "contactPhone"     VARCHAR(20)   NULL,
        "address"          TEXT          NULL,
        "subscriptionPlan" VARCHAR(50)   NOT NULL DEFAULT 'basic',
        "maxUsers"         INTEGER       NOT NULL DEFAULT 10,
        "settings"         JSONB,
        "createdAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updatedAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "disabledAt"       TIMESTAMPTZ   NULL,
        "deletedAt"        TIMESTAMPTZ   NULL
      )
    `);

        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tenants_slug" ON "tenants" ("slug")
    `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tenants_slug"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    }
}
