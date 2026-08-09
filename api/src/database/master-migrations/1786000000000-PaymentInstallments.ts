import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits subscription billing into obligation + tranches.
 *
 * Before: one `payments` row WAS the whole billing period, so a period
 * settled across several transfers, and the state "partially paid", were
 * both inexpressible.
 *
 * After:
 *   payments              → the obligation (what is owed for the period)
 *   payment_installments  → the tranches (each act of payment, with its
 *                           own type and date)
 *
 * Every existing `payments` row is backfilled into exactly one installment
 * carrying its method / reference / receipt / validation state, so no
 * history is lost. Balance and status are then derived in SQL from those
 * children — which is why the `status` column is dropped rather than kept.
 */
export class PaymentInstallments1786000000000 implements MigrationInterface {
  name = 'PaymentInstallments1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Tranche table ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_installments" (
        "id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "paymentId"       UUID          NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
        "tenantId"        INTEGER       NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
        "amount"          DECIMAL(12,2) NOT NULL,
        "paymentDate"     DATE          NOT NULL,
        "paymentType"     VARCHAR(20)   NOT NULL DEFAULT 'other',
        "status"          VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "referenceNumber" VARCHAR(100),
        "receiptUrl"      VARCHAR(500),
        "notes"           TEXT,
        "validatedBy"     VARCHAR(255),
        "validatedAt"     TIMESTAMPTZ,
        "rejectionReason" TEXT,
        "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installments_paymentId"      ON "payment_installments" ("paymentId");
      CREATE INDEX IF NOT EXISTS "IDX_installments_tenantId"       ON "payment_installments" ("tenantId");
      CREATE INDEX IF NOT EXISTS "IDX_installments_status"         ON "payment_installments" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_installments_paymentDate"    ON "payment_installments" ("paymentDate");
      CREATE INDEX IF NOT EXISTS "IDX_installments_payment_status" ON "payment_installments" ("paymentId", "status");
    `);

    // ── 2. Obligation columns ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "dueDate"    DATE,
        ADD COLUMN IF NOT EXISTS "voidedAt"   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "voidReason" TEXT
    `);

    // Existing rows had no due-date concept — the period start is the
    // closest faithful reading of when the money was expected.
    await queryRunner.query(
      `UPDATE "payments" SET "dueDate" = "periodStart" WHERE "dueDate" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "dueDate" SET NOT NULL`,
    );

    // ── 3. Backfill each legacy payment as a single tranche ──────────────────
    // Runs BEFORE the source columns are dropped.
    await queryRunner.query(`
      INSERT INTO "payment_installments" (
        "paymentId", "tenantId", "amount", "paymentDate", "paymentType",
        "status", "referenceNumber", "receiptUrl", "notes",
        "validatedBy", "validatedAt", "rejectionReason", "createdAt", "updatedAt"
      )
      SELECT
        p."id",
        p."tenantId",
        p."amount",
        COALESCE(p."validatedAt"::date, p."createdAt"::date, p."periodStart"),
        COALESCE(NULLIF(p."paymentMethod", ''), 'other'),
        p."status",
        p."referenceNumber",
        p."receiptUrl",
        p."notes",
        p."validatedBy",
        p."validatedAt",
        p."rejectionReason",
        p."createdAt",
        p."updatedAt"
      FROM "payments" p
    `);

    // ── 4. Obligation no longer carries the act of payment ───────────────────
    await queryRunner.query(
      `ALTER TABLE "payments" RENAME COLUMN "amount" TO "amountDue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amountDue" TYPE DECIMAL(12,2)`,
    );
    await queryRunner.query(`
      ALTER TABLE "payments"
        DROP COLUMN IF EXISTS "paymentMethod",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "validatedBy",
        DROP COLUMN IF EXISTS "validatedAt",
        DROP COLUMN IF EXISTS "rejectionReason",
        DROP COLUMN IF EXISTS "referenceNumber",
        DROP COLUMN IF EXISTS "receiptUrl"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_dueDate"       ON "payments" ("dueDate");
      CREATE INDEX IF NOT EXISTS "IDX_payments_tenant_period" ON "payments" ("tenantId", "periodStart");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payments_tenant_period"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_dueDate"`);

    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "paymentMethod"   VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "status"          VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "validatedBy"     VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "validatedAt"     TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
        ADD COLUMN IF NOT EXISTS "referenceNumber" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "receiptUrl"      VARCHAR(500)
    `);

    // Fold the tranches back into the parent: the earliest one restores the
    // legacy single-payment shape. Multi-tranche history cannot survive a
    // model with no room for it — this is a faithful but lossy reversal.
    await queryRunner.query(`
      UPDATE "payments" p SET
        "paymentMethod"   = i."paymentType",
        "status"          = i."status",
        "validatedBy"     = i."validatedBy",
        "validatedAt"     = i."validatedAt",
        "rejectionReason" = i."rejectionReason",
        "referenceNumber" = i."referenceNumber",
        "receiptUrl"      = i."receiptUrl"
      FROM (
        SELECT DISTINCT ON ("paymentId") *
        FROM "payment_installments"
        ORDER BY "paymentId", "paymentDate" ASC, "createdAt" ASC
      ) i
      WHERE i."paymentId" = p."id"
    `);

    await queryRunner.query(
      `ALTER TABLE "payments" RENAME COLUMN "amountDue" TO "amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amount" TYPE DECIMAL(10,2)`,
    );
    await queryRunner.query(`
      ALTER TABLE "payments"
        DROP COLUMN IF EXISTS "dueDate",
        DROP COLUMN IF EXISTS "voidedAt",
        DROP COLUMN IF EXISTS "voidReason"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "payment_installments"`);
  }
}
