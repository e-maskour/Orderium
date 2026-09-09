import { Client, Pool } from 'pg';

/**
 * Proves the claim is race-proof against a real Postgres.
 *
 * The unit tests mock the query, so they can only check the SQL text. This is
 * the one property that unit tests cannot establish: that two agents watching
 * the same warehouse can never both take a job. If it ever breaks, a shop
 * hands the customer two receipts and the till does not balance.
 *
 * Requires a database. Set PRINT_TEST_DATABASE_URL to run it, e.g.
 *   PRINT_TEST_DATABASE_URL=postgres://postgres_user:postgres_password@localhost:5432/orderium_demo \
 *     pnpm test claim-concurrency
 */
const DB_URL = process.env.PRINT_TEST_DATABASE_URL;
const describeIfDb = DB_URL ? describe : describe.skip;

/** Exactly the statement PrintJobsAgentService.claim() issues. */
const CLAIM_SQL = `
  UPDATE print_jobs
     SET status = 'claimed',
         agent_id = $1,
         claimed_at = now(),
         attempts = attempts + 1
   WHERE id = $2
     AND warehouse_id = $3
     AND status = 'queued'
   RETURNING *`;

describeIfDb('print job claim, against a real database', () => {
  const CONCURRENCY = 10;
  let pool: Pool;
  let warehouseId: number;
  let printerId: string;
  let agentIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({ connectionString: DB_URL, max: CONCURRENCY + 2 });

    const wh = await pool.query<{ id: number }>(
      'SELECT id FROM warehouses ORDER BY id LIMIT 1',
    );
    if (!wh.rows.length) throw new Error('No warehouse in the test database');
    warehouseId = wh.rows[0].id;

    const printer = await pool.query<{ id: string }>(
      `INSERT INTO printers
         (name, brand, connection_type, warehouse_id, kind, paper_width, document_types, ip, port)
       VALUES ('__claim_race_test', 'epson', 'network', $1, 'thermal', 80, ARRAY['receipt'], '127.0.0.1', 9100)
       RETURNING id`,
      [warehouseId],
    );
    printerId = printer.rows[0].id;

    const agents = await pool.query<{ id: string }>(
      `INSERT INTO print_agents (name, warehouse_id)
       SELECT '__claim_race_agent_' || g, $1 FROM generate_series(1, $2) g
       RETURNING id`,
      [warehouseId, CONCURRENCY],
    );
    agentIds = agents.rows.map((r) => r.id);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM print_jobs WHERE idempotency_key LIKE '__claim_race%'`);
    await pool.query(`DELETE FROM print_agents WHERE name LIKE '__claim_race_agent%'`);
    await pool.query(`DELETE FROM printers WHERE name = '__claim_race_test'`);
    await pool.end();
  });

  async function queueJob(key: string): Promise<string> {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO print_jobs
         (printer_id, warehouse_id, document_type, document_ref, idempotency_key, status)
       VALUES ($1, $2, 'receipt', 1, $3, 'queued')
       RETURNING id`,
      [printerId, warehouseId, key],
    );
    return res.rows[0].id;
  }

  it('lets exactly one of many simultaneous agents claim a job', async () => {
    const jobId = await queueJob('__claim_race_1');

    // Separate connections, issued together — real contention, not interleaved
    // promises on one connection.
    const clients = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const c = new Client({ connectionString: DB_URL });
        await c.connect();
        return c;
      }),
    );

    try {
      const results = await Promise.all(
        clients.map((c, i) => c.query(CLAIM_SQL, [agentIds[i], jobId, warehouseId])),
      );
      const winners = results.filter((r) => r.rowCount === 1);

      expect(winners).toHaveLength(1);
      expect(results.filter((r) => r.rowCount === 0)).toHaveLength(CONCURRENCY - 1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  }, 30_000);

  it('records the winning agent and one attempt, not many', async () => {
    const jobId = await queueJob('__claim_race_2');

    const clients = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const c = new Client({ connectionString: DB_URL });
        await c.connect();
        return c;
      }),
    );

    try {
      await Promise.all(
        clients.map((c, i) => c.query(CLAIM_SQL, [agentIds[i], jobId, warehouseId])),
      );
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }

    const { rows } = await pool.query<{
      status: string;
      agent_id: string;
      attempts: number;
    }>('SELECT status, agent_id, attempts FROM print_jobs WHERE id = $1', [jobId]);

    expect(rows[0].status).toBe('claimed');
    expect(agentIds).toContain(rows[0].agent_id);
    // Nine losing UPDATEs matched no row, so attempts must be exactly 1.
    expect(rows[0].attempts).toBe(1);
  }, 30_000);

  it('refuses a claim from an agent in another warehouse', async () => {
    const jobId = await queueJob('__claim_race_3');
    const res = await pool.query(CLAIM_SQL, [agentIds[0], jobId, warehouseId + 9999]);
    expect(res.rowCount).toBe(0);
  });

  it('cannot claim a job twice, even sequentially', async () => {
    const jobId = await queueJob('__claim_race_4');
    const first = await pool.query(CLAIM_SQL, [agentIds[0], jobId, warehouseId]);
    const second = await pool.query(CLAIM_SQL, [agentIds[1], jobId, warehouseId]);
    expect(first.rowCount).toBe(1);
    expect(second.rowCount).toBe(0);
  });
});
