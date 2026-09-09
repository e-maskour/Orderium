import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns print_jobs from a write-only audit log into the durable queue that
 * print agents claim work from.
 *
 * Two notes on the data:
 *
 *  - `document_id` is uuid, but every document in this system uses integer ids
 *    (see PDFController, which parseInt()s them). A new `document_ref` integer
 *    column is added; historical rows keep a null ref rather than losing their
 *    history to a conversion that cannot succeed.
 *
 *  - `method` ('epson-epos' | 'star-webprnt' | 'qztray' | 'browser') describes
 *    transports that no longer exist. It is kept nullable so existing history
 *    stays readable, and is simply no longer written.
 */
export class PrintJobsQueue1778000100000 implements MigrationInterface {
  name = 'PrintJobsQueue1778000100000';

  public async up(q: QueryRunner): Promise<void> {
    for (const ddl of [
      `ADD COLUMN IF NOT EXISTS warehouse_id integer`,
      `ADD COLUMN IF NOT EXISTS agent_id uuid`,
      `ADD COLUMN IF NOT EXISTS document_ref integer`,
      `ADD COLUMN IF NOT EXISTS idempotency_key varchar(200)`,
      `ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3`,
      `ADD COLUMN IF NOT EXISTS queued_at timestamptz NOT NULL DEFAULT now()`,
      `ADD COLUMN IF NOT EXISTS claimed_at timestamptz`,
      `ADD COLUMN IF NOT EXISTS completed_at timestamptz`,
    ]) {
      await q.query(`ALTER TABLE print_jobs ${ddl}`);
    }

    // Historical rows are terminal. 'fallback' meant "the silent path failed and
    // we opened the browser dialog", which did produce a printed receipt.
    await q.query(`UPDATE print_jobs SET status = 'done' WHERE status IN ('success', 'fallback')`);
    await q.query(`UPDATE print_jobs SET completed_at = printed_at WHERE completed_at IS NULL`);
    await q.query(`
      UPDATE print_jobs SET idempotency_key = 'legacy-' || id::text
       WHERE idempotency_key IS NULL
    `);

    await q.query(`ALTER TABLE print_jobs ALTER COLUMN idempotency_key SET NOT NULL`);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_idempotency
        ON print_jobs (idempotency_key)
    `);
    // The dispatch query: "queued jobs for this warehouse, oldest first".
    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_dispatch
        ON print_jobs (warehouse_id, status, queued_at)
    `);

    // The column default was 'success', which the new constraint rejects — a
    // raw insert omitting status would fail.
    await q.query(`ALTER TABLE print_jobs ALTER COLUMN status SET DEFAULT 'queued'`);

    await q.query(`ALTER TABLE print_jobs DROP CONSTRAINT IF EXISTS print_jobs_status_check`);
    await q.query(`
      ALTER TABLE print_jobs ADD CONSTRAINT print_jobs_status_check
        CHECK (status IN ('queued','claimed','printing','done','failed','cancelled'))
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE print_jobs DROP CONSTRAINT IF EXISTS print_jobs_status_check`);
    await q.query(`DROP INDEX IF EXISTS idx_print_jobs_dispatch`);
    await q.query(`DROP INDEX IF EXISTS idx_print_jobs_idempotency`);

    await q.query(`ALTER TABLE print_jobs ALTER COLUMN status SET DEFAULT 'success'`);
    await q.query(`UPDATE print_jobs SET status = 'success' WHERE status = 'done'`);
    await q.query(`
      UPDATE print_jobs SET status = 'failed'
       WHERE status IN ('queued','claimed','printing','cancelled')
    `);

    for (const col of [
      'completed_at', 'claimed_at', 'queued_at', 'max_attempts',
      'attempts', 'idempotency_key', 'document_ref', 'agent_id', 'warehouse_id',
    ]) {
      await q.query(`ALTER TABLE print_jobs DROP COLUMN IF EXISTS ${col}`);
    }
  }
}
