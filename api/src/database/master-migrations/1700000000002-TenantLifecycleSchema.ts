import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full tenant lifecycle schema migration:
 * - Rewrites tenants table columns (status-based lifecycle, subscription, limits)
 * - Creates subscription_plans table with default seed data
 * - Creates payments table
 * - Creates tenant_activity_log table
 */
export class TenantLifecycleSchema1700000000002 implements MigrationInterface {
  name = 'TenantLifecycleSchema1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Extend tenants table ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "contactName"           VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "notes"                 TEXT,
        ADD COLUMN IF NOT EXISTS "status"                VARCHAR(20)  NOT NULL DEFAULT 'trial',
        ADD COLUMN IF NOT EXISTS "previousStatus"        VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "statusChangedAt"       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "statusReason"          TEXT,
        ADD COLUMN IF NOT EXISTS "trialDays"             INTEGER      NOT NULL DEFAULT 30,
        ADD COLUMN IF NOT EXISTS "trialStartedAt"        TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "trialEndsAt"           TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "subscriptionStartedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "subscriptionEndsAt"    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "autoRenew"             BOOLEAN      NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "maxProducts"           INTEGER      NOT NULL DEFAULT 100,
        ADD COLUMN IF NOT EXISTS "maxOrdersPerMonth"     INTEGER      NOT NULL DEFAULT 500,
        ADD COLUMN IF NOT EXISTS "maxStorageMb"          INTEGER      NOT NULL DEFAULT 500,
        ADD COLUMN IF NOT EXISTS "archivedAt"            TIMESTAMPTZ
    `);

    // Backfill status from isActive/deletedAt
    await queryRunner.query(`
      UPDATE "tenants"
        SET "status" = CASE
          WHEN "deletedAt" IS NOT NULL THEN 'deleted'
          WHEN "isActive" = FALSE      THEN 'disabled'
          ELSE 'active'
        END
      WHERE "status" = 'trial'
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "tenants"("status");
      CREATE INDEX IF NOT EXISTS "idx_tenants_subscription_ends" ON "tenants"("subscriptionEndsAt");
    `);

    // ── 2. subscription_plans ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_plans" (
        "id"                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"              VARCHAR(50)  NOT NULL UNIQUE,
        "displayName"       VARCHAR(100) NOT NULL,
        "priceMonthly"      DECIMAL(10,2) NOT NULL DEFAULT 0,
        "priceYearly"       DECIMAL(10,2) NOT NULL DEFAULT 0,
        "currency"          VARCHAR(3)   NOT NULL DEFAULT 'MAD',
        "maxUsers"          INTEGER      NOT NULL,
        "maxProducts"       INTEGER      NOT NULL,
        "maxOrdersPerMonth" INTEGER      NOT NULL,
        "maxStorageMb"      INTEGER      NOT NULL,
        "features"          JSONB        NOT NULL DEFAULT '{}',
        "isActive"          BOOLEAN      NOT NULL DEFAULT TRUE,
        "sortOrder"         INTEGER      NOT NULL DEFAULT 0,
        "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("name","displayName","priceMonthly","priceYearly","maxUsers","maxProducts","maxOrdersPerMonth","maxStorageMb","features","sortOrder")
      VALUES
        ('trial',      'Free Trial',   0,    0,     5,   100,  500,   500,   '{"delivery":true,"reports":false,"api_access":false,"white_label":false}', 0),
        ('basic',      'Basic',        199,  1990,  10,  500,  2000,  2000,  '{"delivery":true,"reports":true,"api_access":false,"white_label":false}',  1),
        ('pro',        'Professional', 399,  3990,  25,  2000, 10000, 5000,  '{"delivery":true,"reports":true,"api_access":true,"white_label":false}',   2),
        ('enterprise', 'Enterprise',   799,  7990,  100, 9999, 99999, 20000, '{"delivery":true,"reports":true,"api_access":true,"white_label":true}',    3)
      ON CONFLICT ("name") DO NOTHING
    `);

    // ── 3. payments ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"        INTEGER      NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
        "amount"          DECIMAL(10,2) NOT NULL,
        "currency"        VARCHAR(3)   NOT NULL DEFAULT 'MAD',
        "paymentMethod"   VARCHAR(50),
        "planName"        VARCHAR(20)  NOT NULL,
        "billingCycle"    VARCHAR(10)  NOT NULL,
        "periodStart"     DATE         NOT NULL,
        "periodEnd"       DATE         NOT NULL,
        "status"          VARCHAR(20)  NOT NULL DEFAULT 'pending',
        "validatedBy"     VARCHAR(255),
        "validatedAt"     TIMESTAMPTZ,
        "rejectionReason" TEXT,
        "referenceNumber" VARCHAR(100),
        "receiptUrl"      VARCHAR(500),
        "notes"           TEXT,
        "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_tenant" ON "payments"("tenantId");
      CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("status");
    `);

    // ── 4. tenant_activity_log ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_activity_log" (
        "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"    INTEGER      NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
        "action"      VARCHAR(50)  NOT NULL,
        "details"     JSONB        NOT NULL DEFAULT '{}',
        "performedBy" VARCHAR(100),
        "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_activity_tenant" ON "tenant_activity_log"("tenantId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_activity_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        DROP COLUMN IF EXISTS "contactName",
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "previousStatus",
        DROP COLUMN IF EXISTS "statusChangedAt",
        DROP COLUMN IF EXISTS "statusReason",
        DROP COLUMN IF EXISTS "trialDays",
        DROP COLUMN IF EXISTS "trialStartedAt",
        DROP COLUMN IF EXISTS "trialEndsAt",
        DROP COLUMN IF EXISTS "subscriptionStartedAt",
        DROP COLUMN IF EXISTS "subscriptionEndsAt",
        DROP COLUMN IF EXISTS "autoRenew",
        DROP COLUMN IF EXISTS "maxProducts",
        DROP COLUMN IF EXISTS "maxOrdersPerMonth",
        DROP COLUMN IF EXISTS "maxStorageMb",
        DROP COLUMN IF EXISTS "archivedAt"
    `);
  }
}
