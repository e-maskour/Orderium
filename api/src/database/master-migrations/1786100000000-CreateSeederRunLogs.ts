import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit trail for seeder executions, mirroring `migration_run_logs`.
 *
 * Seeders have no per-tenant ledger of their own — status is derived by
 * checking the tenant for drift — so this table answers the separate question
 * of who ran what, when, and what it did.
 */
export class CreateSeederRunLogs1786100000000 implements MigrationInterface {
  name = 'CreateSeederRunLogs1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seeder_run_logs" (
        "id"           SERIAL PRIMARY KEY,
        "tenantId"     integer      NOT NULL,
        "tenantSlug"   varchar(100) NOT NULL,
        "tenantName"   varchar(255) NOT NULL,
        "seederKey"    varchar(60)  NOT NULL,
        "seederName"   varchar(120) NOT NULL,
        "operation"    varchar(20)  NOT NULL,
        "status"       varchar(20)  NOT NULL,
        "created"      integer      NOT NULL DEFAULT 0,
        "pruned"       integer      NOT NULL DEFAULT 0,
        "optionsUsed"  jsonb,
        "detail"       text,
        "errorMessage" text,
        "durationMs"   integer,
        "executed_at"  TIMESTAMP    NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_seeder_run_logs_tenantId" ON "seeder_run_logs" ("tenantId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_seeder_run_logs_seederKey" ON "seeder_run_logs" ("seederKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_seeder_run_logs_executedAt" ON "seeder_run_logs" ("executed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_seeder_run_logs_status" ON "seeder_run_logs" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "seeder_run_logs"`);
  }
}
