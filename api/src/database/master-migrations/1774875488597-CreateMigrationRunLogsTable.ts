import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMigrationRunLogsTable1774875488597 implements MigrationInterface {
    name = 'CreateMigrationRunLogsTable1774875488597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "payments_tenantId_fkey"`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" DROP CONSTRAINT "tenant_activity_log_tenantId_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_activity_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tenants_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tenants_subscription_ends"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tenants_slug"`);
        await queryRunner.query(`CREATE TABLE "migration_run_logs" ("id" SERIAL NOT NULL, "tenantId" integer NOT NULL, "tenantSlug" character varying(100) NOT NULL, "tenantName" character varying(255) NOT NULL, "operation" character varying(20) NOT NULL, "status" character varying(20) NOT NULL, "migrationsExecuted" jsonb, "errorMessage" text, "durationMs" integer, "executed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9ddd4151a29faf119bb3df0320" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae97fa65ae5bca6c9e1fd274c6" ON "migration_run_logs" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_82868fd4bd901caf1ce4515f5b" ON "migration_run_logs" ("executed_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_b90746dab3c9e7118d04d13971" ON "migration_run_logs" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "subscriptionPlan"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "subscriptionPlan" character varying(20) NOT NULL DEFAULT 'trial'`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "maxUsers" SET DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_98a04cdcbac4f6a2c55c7d1935" ON "payments" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a0db175c3ceea97e92869ef3bd" ON "tenant_activity_log" ("tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2310ecc5cb8be427097154b18f" ON "tenants" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_c59559e7872bc9726adef4669f" ON "tenants" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_aeda3fbdae9b3fbd23a3ba2dc8" ON "tenants" ("subscriptionEndsAt") `);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_98a04cdcbac4f6a2c55c7d19350" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" ADD CONSTRAINT "FK_a0db175c3ceea97e92869ef3bd4" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" DROP CONSTRAINT "FK_a0db175c3ceea97e92869ef3bd4"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_98a04cdcbac4f6a2c55c7d19350"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aeda3fbdae9b3fbd23a3ba2dc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c59559e7872bc9726adef4669f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2310ecc5cb8be427097154b18f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0db175c3ceea97e92869ef3bd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98a04cdcbac4f6a2c55c7d1935"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "maxUsers" SET DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "subscriptionPlan"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "subscriptionPlan" character varying(50) NOT NULL DEFAULT 'basic'`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc"`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b90746dab3c9e7118d04d13971"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82868fd4bd901caf1ce4515f5b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae97fa65ae5bca6c9e1fd274c6"`);
        await queryRunner.query(`DROP TABLE "migration_run_logs"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tenants_slug" ON "tenants" ("slug") `);
        await queryRunner.query(`CREATE INDEX "idx_tenants_subscription_ends" ON "tenants" ("subscriptionEndsAt") `);
        await queryRunner.query(`CREATE INDEX "idx_tenants_status" ON "tenants" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_activity_tenant" ON "tenant_activity_log" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_status" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_tenant" ON "payments" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "tenant_activity_log" ADD CONSTRAINT "tenant_activity_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
