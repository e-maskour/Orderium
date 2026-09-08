import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cross-tenant monitoring storage in `orderium_master`.
 *
 *  - `tenant_daily_metrics`  one row per tenant per day (counts, money,
 *                            footprint, activity, feature usage)
 *  - `tenant_health_buckets` one row per tenant per hour (requests, errors,
 *                            latency)
 *
 * Both are write-mostly with an upsert on a natural key, so the unique
 * constraints below are load-bearing, not just hygiene.
 */
export class PlatformMetrics1787000000000 implements MigrationInterface {
  name = 'PlatformMetrics1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenant_daily_metrics" (
        "id"                 uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId"           integer NOT NULL,
        "metricDate"         date NOT NULL,

        "ordersTotal"        integer NOT NULL DEFAULT 0,
        "ordersByOrigin"     jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ordersByStatus"     jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ordersToday"        integer NOT NULL DEFAULT 0,
        "ordersThisMonth"    integer NOT NULL DEFAULT 0,

        "quotesTotal"        integer NOT NULL DEFAULT 0,
        "quotesByStatus"     jsonb NOT NULL DEFAULT '{}'::jsonb,
        "quotesToday"        integer NOT NULL DEFAULT 0,

        "invoicesTotal"      integer NOT NULL DEFAULT 0,
        "invoicesUnpaid"     integer NOT NULL DEFAULT 0,
        "invoicesToday"      integer NOT NULL DEFAULT 0,

        "revenueTotal"       numeric(18,2) NOT NULL DEFAULT 0,
        "revenueThisMonth"   numeric(18,2) NOT NULL DEFAULT 0,
        "invoicedTotal"      numeric(18,2) NOT NULL DEFAULT 0,

        "usersTotal"         integer NOT NULL DEFAULT 0,
        "usersAdmin"         integer NOT NULL DEFAULT 0,
        "usersClient"        integer NOT NULL DEFAULT 0,
        "productsTotal"      integer NOT NULL DEFAULT 0,
        "partnersCustomers"  integer NOT NULL DEFAULT 0,
        "partnersSuppliers"  integer NOT NULL DEFAULT 0,

        "dbSizeBytes"        bigint NOT NULL DEFAULT 0,
        "storageBytes"       bigint NOT NULL DEFAULT 0,

        "activeUsers"        integer NOT NULL DEFAULT 0,
        "loginCount"         integer NOT NULL DEFAULT 0,
        "lastActivityAt"     TIMESTAMP WITH TIME ZONE,

        "apiCalls"           integer NOT NULL DEFAULT 0,
        "callsByModule"      jsonb NOT NULL DEFAULT '{}'::jsonb,

        "collectedAt"        TIMESTAMP WITH TIME ZONE,
        "durationMs"         integer,
        "collectionError"    text,
        "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_tenant_daily_metrics" PRIMARY KEY ("id")
      )
    `);

    // The upsert target for both the nightly collector and the usage flusher.
    await queryRunner.query(`
      ALTER TABLE "tenant_daily_metrics"
        ADD CONSTRAINT "UQ_tenant_daily_metrics_tenant_date"
        UNIQUE ("tenantId", "metricDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_daily_metrics_tenantId"
        ON "tenant_daily_metrics" ("tenantId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_daily_metrics_metricDate"
        ON "tenant_daily_metrics" ("metricDate")
    `);
    // Serves the DISTINCT ON (tenantId) ORDER BY tenantId, metricDate DESC
    // that every dashboard read starts with.
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_daily_metrics_tenant_date_desc"
        ON "tenant_daily_metrics" ("tenantId", "metricDate" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_health_buckets" (
        "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId"      integer NOT NULL,
        "bucketStart"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "requests"      integer NOT NULL DEFAULT 0,
        "errors4xx"     integer NOT NULL DEFAULT 0,
        "errors5xx"     integer NOT NULL DEFAULT 0,
        "slowRequests"  integer NOT NULL DEFAULT 0,
        "latencySumMs"  bigint NOT NULL DEFAULT 0,
        "latencyMaxMs"  integer NOT NULL DEFAULT 0,
        "latencyP95Ms"  integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_tenant_health_buckets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_health_buckets"
        ADD CONSTRAINT "UQ_tenant_health_buckets_tenant_bucket"
        UNIQUE ("tenantId", "bucketStart")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_health_buckets_tenantId"
        ON "tenant_health_buckets" ("tenantId")
    `);
    // Every health query is a window scan by time, then a group by tenant.
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_health_buckets_bucketStart"
        ON "tenant_health_buckets" ("bucketStart")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_health_buckets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_daily_metrics"`);
  }
}
