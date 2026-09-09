import { ChildProcess, execFileSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { Client } from 'pg';
import * as jwt from 'jsonwebtoken';

/**
 * The whole print path, end to end, with the real agent binary.
 *
 * Every bug found while building this feature was invisible to unit tests:
 * a route shadowed by another controller, a global interceptor silently
 * mangling the SSE payload, a migration that recorded itself as applied
 * without creating its tables. All three only appear when the real pieces run
 * together, which is what this exercises.
 *
 * Requires the dev stack. Enable with:
 *   PRINT_E2E=1 \
 *   E2E_DATABASE_URL=postgres://postgres_user:postgres_password@localhost:5432/orderium_demo \
 *   E2E_JWT_SECRET=<the API's JWT_SECRET> \
 *   pnpm test:e2e
 */
const ENABLED = process.env.PRINT_E2E === '1';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const TENANT = process.env.E2E_TENANT ?? 'demo';
const DB_URL = process.env.E2E_DATABASE_URL;
const JWT_SECRET = process.env.E2E_JWT_SECRET;
const PRINTER_PORT = Number(process.env.E2E_PRINTER_PORT ?? 9199);

const describeE2E = ENABLED && DB_URL && JWT_SECRET ? describe : describe.skip;

const NAME = '__e2e_print_flow';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A socket server standing in for a thermal printer. */
class FakePrinter {
  private server?: net.Server;
  received: Buffer[] = [];

  start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        socket.on('data', (chunk) => this.received.push(chunk));
      });
      this.server.listen(port, '127.0.0.1', () => resolve());
    });
  }

  reset(): void {
    this.received = [];
  }

  get bytes(): Buffer {
    return Buffer.concat(this.received);
  }

  /** Each receipt begins with ESC @; counting them counts receipts. */
  get receiptCount(): number {
    let n = 0;
    const b = this.bytes;
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i] === 0x1b && b[i + 1] === 0x40) n++;
    }
    return n;
  }

  stop(): void {
    this.server?.close();
  }
}

describeE2E('print flow, end to end', () => {
  const agentDir = path.join(os.tmpdir(), `e2e-agent-${Date.now()}`);
  const entry = path.join(__dirname, '..', '..', '..', 'dist', 'index.js');

  let db: Client;
  let printer: FakePrinter;
  let agent: ChildProcess | undefined;
  let agentLog = '';
  let warehouseId: number;
  let printerId: string;
  let orderRef: number;
  let token: string;

  const api = async (
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<{ status: number; body: any }> => {
    const res = await fetch(`${API_URL}/api${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT,
        Authorization: `Bearer ${token}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const readAgentConfig = async (): Promise<{
    agentId: string;
    agentKey: string;
    tenantSlug: string;
    warehouseId: number;
  }> =>
    JSON.parse(
      await fs.readFile(
        path.join(agentDir, '.orderium-print-agent', 'config.json'),
        'utf8',
      ),
    );

  const jobStatus = async (id: string): Promise<string> =>
    (await api(`/print-jobs/${id}`)).body?.data?.status;

  const waitForStatus = async (id: string, want: string, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await jobStatus(id)) === want) return true;
      await sleep(500);
    }
    return false;
  };

  async function startAgent(): Promise<void> {
    agent = spawn('node', [entry], {
      env: { ...process.env, ORDERIUM_AGENT_HOME: agentDir, LOG_LEVEL: 'debug' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    agent.stdout?.on('data', (d) => (agentLog += d.toString()));
    agent.stderr?.on('data', (d) => (agentLog += d.toString()));

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && !agentLog.includes('Job stream connected')) {
      await sleep(200);
    }
    if (!agentLog.includes('Job stream connected')) {
      throw new Error(`Agent did not connect. Log:\n${agentLog}`);
    }
  }

  async function stopAgent(): Promise<void> {
    if (!agent) return;
    agent.kill('SIGTERM');
    await sleep(1500);
    agent = undefined;
  }

  beforeAll(async () => {
    // The agent binary must be built — this test drives the real artifact.
    await fs.access(entry).catch(() => {
      throw new Error(`Agent not built at ${entry}. Run: pnpm build`);
    });

    db = new Client({ connectionString: DB_URL });
    await db.connect();

    token = jwt.sign(
      {
        sub: 1,
        phoneNumber: '0600000000',
        isAdmin: true,
        isCustomer: false,
        scope: 'admin',
      },
      JWT_SECRET as string,
      { expiresIn: '30m' },
    );

    const wh = await db.query<{ id: number }>(
      'SELECT id FROM warehouses ORDER BY id LIMIT 1',
    );
    if (!wh.rows.length) throw new Error('No warehouse in the e2e database');
    warehouseId = wh.rows[0].id;

    const order = await db.query<{ id: number }>(
      'SELECT id FROM orders ORDER BY id LIMIT 1',
    );
    if (!order.rows.length) throw new Error('No order in the e2e database');
    orderRef = order.rows[0].id;

    printer = new FakePrinter();
    await printer.start(PRINTER_PORT);

    await db.query(`DELETE FROM print_jobs WHERE idempotency_key LIKE '%${NAME}%'`);
    await db.query(`DELETE FROM print_agents WHERE name = '${NAME}'`);
    await db.query(`DELETE FROM printers WHERE name = '${NAME}'`);

    const p = await db.query<{ id: string }>(
      `INSERT INTO printers
         (name, brand, connection_type, warehouse_id, kind, paper_width, document_types, is_default, ip, port)
       VALUES ($1, 'epson', 'network', $2, 'thermal', 80, ARRAY['receipt'], false, '127.0.0.1', $3)
       RETURNING id`,
      [NAME, warehouseId, PRINTER_PORT],
    );
    printerId = p.rows[0].id;

    await db.query(
      `INSERT INTO print_agents (name, warehouse_id, pairing_code, pairing_expires_at)
       VALUES ($1, $2, 'E2ECODE1', now() + interval '30 minutes')`,
      [NAME, warehouseId],
    );

    // Pair using the real CLI, exactly as an operator would.
    execFileSync(
      'node',
      [entry, 'pair', '--url', API_URL, '--code', `${TENANT}-E2ECODE1`],
      { env: { ...process.env, ORDERIUM_AGENT_HOME: agentDir }, stdio: 'pipe' },
    );

    await startAgent();
  }, 90_000);

  afterAll(async () => {
    await stopAgent();
    printer?.stop();
    if (db) {
      await db.query(`DELETE FROM print_jobs WHERE printer_id = $1`, [printerId]);
      await db.query(`DELETE FROM print_agents WHERE name = '${NAME}'`);
      await db.query(`DELETE FROM printers WHERE name = '${NAME}'`);
      await db.end();
    }
    await fs.rm(agentDir, { recursive: true, force: true });
  }, 30_000);

  it('pairs and writes a 0600 config', async () => {
    const configFile = path.join(agentDir, '.orderium-print-agent', 'config.json');
    const stat = await fs.stat(configFile);
    // Holds a long-lived credential.
    expect(stat.mode & 0o077).toBe(0);
    expect(await readAgentConfig()).toMatchObject({
      tenantSlug: TENANT,
      warehouseId,
    });
  });

  it('exposes the device target to the agent, without internal fields', async () => {
    // Regression guard: the agent could not print at all until this existed.
    const config = await readAgentConfig();
    const res = await fetch(`${API_URL}/api/print-jobs/agent/printers`, {
      headers: {
        'X-Tenant-ID': TENANT,
        'X-Agent-Id': config.agentId,
        Authorization: `Bearer ${config.agentKey}`,
      },
    });
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };

    expect(res.status).toBe(200);
    const mine = body.data.find((d) => d.printerId === printerId);
    expect(mine).toMatchObject({ ip: '127.0.0.1', port: PRINTER_PORT, paperWidth: 80 });
    // Routing and policy fields must stay server-side.
    expect(JSON.stringify(body.data)).not.toContain('warehouseId');
  });

  it('prints a queued receipt and reports done', async () => {
    printer.reset();
    const res = await api('/print-jobs', {
      method: 'POST',
      body: { documentType: 'receipt', documentRef: orderRef, printerId },
    });
    expect(res.status).toBe(201);

    const jobId = res.body.data.id;
    expect(await waitForStatus(jobId, 'done', 20_000)).toBe(true);

    const bytes = printer.bytes;
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40])); // ESC @
    expect(bytes.subarray(-4)).toEqual(Buffer.from([0x1d, 0x56, 0x41, 0x00])); // cut
  }, 40_000);

  it('delivers the job over SSE, not merely via the polling sweep', async () => {
    // The SSE payload was once wrapped by the response interceptor: valid JSON
    // carrying no jobId, so every event was silently dropped and only the 30s
    // sweep ever delivered. Timing alone cannot tell the two apart — a sweep
    // tick can land immediately after queuing — so assert the agent actually
    // logged a stream delivery for THIS job.
    printer.reset();
    const before = agentLog.length;

    const res = await api('/print-jobs', {
      method: 'POST',
      body: { documentType: 'receipt', documentRef: orderRef, printerId, reprintSeq: 2 },
    });
    const jobId = res.body.data.id;

    expect(await waitForStatus(jobId, 'done', 20_000)).toBe(true);
    expect(agentLog.slice(before)).toContain(`Job stream delivered ${jobId}`);
  }, 40_000);

  it('collapses a double-click into a single receipt', async () => {
    printer.reset();
    const body = {
      documentType: 'receipt',
      documentRef: orderRef,
      printerId,
      reprintSeq: 3,
    };

    const first = await api('/print-jobs', { method: 'POST', body });
    const second = await api('/print-jobs', { method: 'POST', body });

    expect(first.body.data.id).toBe(second.body.data.id);
    expect(second.status).toBe(200); // 200 = already queued, not 201
    expect(await waitForStatus(first.body.data.id, 'done', 20_000)).toBe(true);

    await sleep(1500);
    expect(printer.receiptCount).toBe(1);
  }, 40_000);

  it('queues without printing when no agent is running, then prints on return', async () => {
    await stopAgent();
    printer.reset();

    const res = await api('/print-jobs', {
      method: 'POST',
      body: { documentType: 'receipt', documentRef: orderRef, printerId, reprintSeq: 4 },
    });
    const jobId = res.body.data.id;

    await sleep(6000);
    expect(await jobStatus(jobId)).toBe('queued');
    // Nothing may print while no agent holds the job.
    expect(printer.bytes.length).toBe(0);

    await startAgent();
    expect(await waitForStatus(jobId, 'done', 45_000)).toBe(true);
    expect(printer.bytes.length).toBeGreaterThan(100);
  }, 90_000);
});
