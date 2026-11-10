import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-tenant add-ons sold on top of the plan: packs of users, warehouses,
 * delivery persons and storage, plus single features outside the plan.
 * Effective limits on the tenant row = plan + add-ons.
 */
export class TenantAddons1789100000000 implements MigrationInterface {
  name = 'TenantAddons1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "addons" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "addons"`,
    );
  }
}
