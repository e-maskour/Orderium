import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Subscription plans v2 — Moroccan pricing (DH HT, yearly = 10 × monthly).
 *
 * - Adds `maxWarehouses` / `maxDeliveryPersons` limits to plans and tenants.
 * - Adds per-tenant `features` (copied from the plan, overridable).
 * - Replaces the catalogue with trial / starter / business / pro / enterprise.
 *   The old `basic` plan maps to `business`; `pro` and `enterprise` keep
 *   their keys with the new limits.
 *
 * `-1` means unlimited in every limit column.
 */
export class SubscriptionPlansV21789000000000 implements MigrationInterface {
  name = 'SubscriptionPlansV21789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['subscription_plans', 'tenants']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "maxWarehouses" integer NOT NULL DEFAULT 1`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "maxDeliveryPersons" integer NOT NULL DEFAULT 0`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "features" jsonb NOT NULL DEFAULT '{}'`,
    );

    // Upsert the new catalogue.
    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("name","displayName","priceMonthly","priceYearly","currency",
         "maxUsers","maxProducts","maxWarehouses","maxDeliveryPersons",
         "maxOrdersPerMonth","maxStorageMb","features","isActive","sortOrder")
      VALUES
        ('trial',      'Essai gratuit', 0,    0,     'MAD', 3,  500,  2,  3,  1000,  1024,   '{"pos":true,"delivery":true,"client_portal":false,"reports":true}',  true, 0),
        ('starter',    'Starter',       149,  1490,  'MAD', 2,  500,  1,  0,  1000,  1024,   '{"pos":false,"delivery":false,"client_portal":false,"reports":false}', true, 1),
        ('business',   'Business',      349,  3490,  'MAD', 5,  5000, 2,  3,  5000,  10240,  '{"pos":true,"delivery":true,"client_portal":false,"reports":true}',  true, 2),
        ('pro',        'Pro',           699,  6990,  'MAD', 15, -1,   5,  -1, 20000, 51200,  '{"pos":true,"delivery":true,"client_portal":true,"reports":true}',   true, 3),
        ('enterprise', 'Entreprise',    1490, 14900, 'MAD', -1, -1,   -1, -1, -1,    204800, '{"pos":true,"delivery":true,"client_portal":true,"reports":true}',   true, 4)
      ON CONFLICT ("name") DO UPDATE SET
        "displayName"        = EXCLUDED."displayName",
        "priceMonthly"       = EXCLUDED."priceMonthly",
        "priceYearly"        = EXCLUDED."priceYearly",
        "currency"           = EXCLUDED."currency",
        "maxUsers"           = EXCLUDED."maxUsers",
        "maxProducts"        = EXCLUDED."maxProducts",
        "maxWarehouses"      = EXCLUDED."maxWarehouses",
        "maxDeliveryPersons" = EXCLUDED."maxDeliveryPersons",
        "maxOrdersPerMonth"  = EXCLUDED."maxOrdersPerMonth",
        "maxStorageMb"       = EXCLUDED."maxStorageMb",
        "features"           = EXCLUDED."features",
        "isActive"           = EXCLUDED."isActive",
        "sortOrder"          = EXCLUDED."sortOrder",
        "updatedAt"          = now()
    `);

    // basic → business (tenants and the plan label on billing records).
    await queryRunner.query(
      `UPDATE "tenants" SET "subscriptionPlan" = 'business' WHERE "subscriptionPlan" = 'basic'`,
    );
    await queryRunner.query(
      `UPDATE "payments" SET "planName" = 'business' WHERE "planName" = 'basic'`,
    );
    await queryRunner.query(
      `DELETE FROM "subscription_plans" WHERE "name" = 'basic'`,
    );

    // Re-apply each tenant's plan limits and features.
    await queryRunner.query(`
      UPDATE "tenants" t SET
        "maxUsers"           = p."maxUsers",
        "maxProducts"        = p."maxProducts",
        "maxWarehouses"      = p."maxWarehouses",
        "maxDeliveryPersons" = p."maxDeliveryPersons",
        "maxOrdersPerMonth"  = p."maxOrdersPerMonth",
        "maxStorageMb"       = p."maxStorageMb",
        "features"           = p."features"
      FROM "subscription_plans" p
      WHERE p."name" = t."subscriptionPlan"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("name","displayName","priceMonthly","priceYearly","maxUsers","maxProducts","maxOrdersPerMonth","maxStorageMb","features","sortOrder")
      VALUES
        ('basic', 'Basic', 199, 1990, 10, 500, 2000, 2000, '{"delivery":true,"reports":true,"api_access":false,"white_label":false}', 1)
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(
      `UPDATE "tenants" SET "subscriptionPlan" = 'basic' WHERE "subscriptionPlan" IN ('starter','business')`,
    );
    await queryRunner.query(
      `UPDATE "payments" SET "planName" = 'basic' WHERE "planName" IN ('starter','business')`,
    );
    await queryRunner.query(
      `DELETE FROM "subscription_plans" WHERE "name" IN ('starter','business')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "features"`,
    );
    for (const table of ['subscription_plans', 'tenants']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "maxDeliveryPersons"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "maxWarehouses"`,
      );
    }
  }
}
