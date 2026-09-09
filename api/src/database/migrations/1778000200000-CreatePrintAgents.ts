import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One print agent per shop machine.
 *
 * Keys are stored as bcrypt hashes; the plaintext key is returned once at
 * pairing time and never persisted. A pairing code is single-use with a short
 * TTL, and the partial unique index lets many agents hold NULL at once while
 * an outstanding code stays unique.
 */
export class CreatePrintAgents1778000200000 implements MigrationInterface {
  name = 'CreatePrintAgents1778000200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS print_agents (
        id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name               varchar(60) NOT NULL,
        warehouse_id       integer NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        key_hash           text,
        key_prefix         varchar(8),
        pairing_code       varchar(40),
        pairing_expires_at timestamptz,
        last_seen_at       timestamptz,
        version            varchar(20),
        platform           varchar(20),
        is_enabled         boolean NOT NULL DEFAULT true,
        revoked_at         timestamptz,
        created_at         timestamptz NOT NULL DEFAULT now(),
        updated_at         timestamptz NOT NULL DEFAULT now()
      )
    `);

    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_print_agents_warehouse_name
        ON print_agents (warehouse_id, name)
    `);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_print_agents_pairing
        ON print_agents (pairing_code) WHERE pairing_code IS NOT NULL
    `);

    await q.query(`
      ALTER TABLE print_jobs
        ADD CONSTRAINT fk_print_jobs_agent
        FOREIGN KEY (agent_id) REFERENCES print_agents(id) ON DELETE SET NULL
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE print_jobs DROP CONSTRAINT IF EXISTS fk_print_jobs_agent`,
    );
    await q.query(`DROP TABLE IF EXISTS print_agents`);
  }
}
