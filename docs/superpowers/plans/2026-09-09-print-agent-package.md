# Print Agent Package Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `print-agent` service that runs on a shop machine, claims print jobs for its warehouse, and drives thermal and document printers the browser cannot reach.

**Architecture:** A thin transport. The API already produces final bytes, so the agent contains no ESC/POS logic and no document rendering — it claims a job, fetches bytes, writes them to a device, and reports the outcome. All OS-specific behaviour sits behind one `Device` interface. SSE wakes it; a polling sweep guarantees delivery.

**Tech Stack:** Node 24, TypeScript, `net` (built-in, TCP printers), `eventsource` (SSE with custom headers), `pdf-to-printer` (Windows PDF spooling), `lp`/CUPS (Unix spooling), PowerShell + winspool P/Invoke (Windows raw ESC/POS, no native module), Jest.

**Spec:** `docs/superpowers/specs/2026-09-09-print-agent-design.md`

**Depends on:** `docs/superpowers/plans/2026-09-09-print-agent-api-foundation.md` (complete, branch `feat/print-agent-api`)

## Global Constraints

- Package manager is **pnpm**. Never `npm install` / `yarn`.
- The agent contains **no ESC/POS generation and no document rendering**. Those live in the API so a layout change is a deploy, not a field update. If a task tempts you to format a receipt in the agent, the design has been broken.
- All OS-specific code lives behind the `Device` interface in `src/devices/`. Nothing else may branch on `process.platform`.
- **No native Node modules.** They break cross-platform installs. Windows raw printing uses PowerShell + winspool P/Invoke; Unix uses `lp`.
- Every network call carries three headers: `X-Tenant-ID`, `X-Agent-Id`, `Authorization: Bearer <key>`.
- The agent never retries a job it has already sent to a device — the API owns retry policy.
- Secrets (the agent key) live in a config file with `0600` permissions, never in logs.
- Tests are `*.spec.ts`, run with `pnpm test` from `print-agent/`.

## API contract (as built in Phase 1 — verified against the running API)

Base URL: `<apiUrl>/api`

| Method | Path | Body / Returns |
| --- | --- | --- |
| POST | `/print-agents/pair` | `{pairingCode}` → `data: {agentId, agentKey, warehouseId}` |
| POST | `/print-agents/heartbeat` | `{version, platform, printers:[{id, reachable}]}` → `data: null` |
| GET | `/print-jobs/agent/pending` | → `data: PrintJob[]` |
| POST | `/print-jobs/agent/claim/:id` | → `data: PrintJob`, or **409** if another agent won |
| GET | `/print-jobs/agent/payload/:id` | → `data: {kind:'escpos'\|'pdf', dataBase64, fileName?, target}` |
| POST | `/print-jobs/agent/result/:id` | `{status:'done'\|'failed', durationMs, error?}` → `data: null` |
| GET | `/print-jobs/agent/stream` | SSE, events carry `{jobId}` |

Every response is wrapped: `{code, status, message, data, metadata}`.

The pairing string is `<tenantSlug>-<code>`; the agent takes the slug from everything before the last `-` and uses it as `X-Tenant-ID`.

---

### Task 1: Expose the device target to agents (API gap)

Phase 1 returns bytes but never tells the agent **where** to send them — `ip`, `port` and `systemName` are not on any agent-authenticated route. Without this the agent cannot print, and the heartbeat cannot report reachability.

**Files:**
- Modify: `api/src/modules/printers/print-jobs.agent.service.ts`
- Modify: `api/src/modules/printers/print-jobs.agent.controller.ts`
- Modify: `api/src/modules/printers/__tests__/print-jobs.agent.service.spec.ts`
- Modify: `api/src/common/response-codes.ts`

**Interfaces:**
- Consumes: `PrintPayload` from Phase 1
- Produces:
  - `interface DeviceTarget { printerId: string; connectionType: 'network'|'usb'|'system'; ip: string|null; port: number; systemName: string|null; paperWidth: 80|148 }`
  - `PrintPayload` gains `target: DeviceTarget`
  - `PrintJobsAgentService.printers(agent): Promise<DeviceTarget[]>`
  - `GET /print-jobs/agent/printers` → `data: DeviceTarget[]`

- [ ] **Step 1: Write the failing tests**

Add to `api/src/modules/printers/__tests__/print-jobs.agent.service.spec.ts`:

```ts
describe('PrintJobsAgentService.payload target', () => {
  it('tells the agent where to send the bytes', async () => {
    const { svc } = makeService({
      jobRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'j1', agentId: 'a1', warehouseId: 7, printerId: 'p1',
          documentType: 'receipt', documentRef: 42,
        }),
        update: jest.fn(),
      },
      printerRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'p1', kind: 'thermal', paperWidth: 80, brand: 'epson',
          connectionType: 'network', ip: '192.168.1.50', port: 9100, systemName: null,
        }),
      },
      receipt: {
        build: jest.fn().mockResolvedValue({
          storeName: 'S', orderNumber: 'O', date: 'd', clientName: 'c',
          items: [], subtotal: 0, total: 0,
        }),
      },
    });

    const payload = await svc.payload('j1', AGENT);

    expect(payload.target).toEqual({
      printerId: 'p1',
      connectionType: 'network',
      ip: '192.168.1.50',
      port: 9100,
      systemName: null,
      paperWidth: 80,
    });
  });
});

describe('PrintJobsAgentService.printers', () => {
  it('lists only the agent warehouse printers', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const { svc } = makeService({ printerRepo: { find } });
    await svc.printers(AGENT);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { warehouseId: 7, isEnabled: true } }),
    );
  });

  it('never leaks another warehouse printer', async () => {
    const find = jest.fn().mockResolvedValue([
      { id: 'p1', warehouseId: 7, connectionType: 'network', ip: '1.1.1.1', port: 9100, systemName: null, paperWidth: 80 },
    ]);
    const { svc } = makeService({ printerRepo: { find } });
    const list = await svc.printers(AGENT);
    expect(list.every((p) => 'printerId' in p)).toBe(true);
    expect(JSON.stringify(list)).not.toContain('warehouseId');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-jobs.agent.service`
Expected: FAIL — `payload.target` is undefined, `svc.printers is not a function`

- [ ] **Step 3: Add the DeviceTarget type and populate it**

In `print-jobs.agent.service.ts`:

```ts
export interface DeviceTarget {
  printerId: string;
  connectionType: 'network' | 'usb' | 'system';
  ip: string | null;
  port: number;
  systemName: string | null;
  paperWidth: 80 | 148;
}

function toTarget(printer: Printer): DeviceTarget {
  return {
    printerId: printer.id,
    connectionType: printer.connectionType,
    ip: printer.ip,
    port: printer.port,
    systemName: printer.systemName,
    paperWidth: printer.paperWidth,
  };
}
```

Add `target: DeviceTarget` to the `PrintPayload` interface, set `target: toTarget(printer)` on both the escpos and pdf branches, and add:

```ts
  /** Devices this agent is responsible for; drives the heartbeat probe. */
  async printers(agent: AuthenticatedAgent): Promise<DeviceTarget[]> {
    const printers = await this.printers_.find({
      where: { warehouseId: agent.warehouseId, isEnabled: true },
    });
    return printers.map(toTarget);
  }
```

Rename the existing private getter `printers` to `printers_` so the public method can take the name, and update its three call sites in this file.

- [ ] **Step 4: Add the endpoint**

Add `PJB.PRINTERS: { code: 'PJB200_10', status: 200, message: 'Agent Printers Retrieved' }` to `response-codes.ts`, then in `print-jobs.agent.controller.ts`:

```ts
  @Get('printers')
  @ApiOperation({ summary: 'Devices this agent is responsible for' })
  @ApiResponse({ status: 200, description: 'Agent printers retrieved' })
  async printers(@CurrentAgent() agent: AuthenticatedAgent) {
    return ApiRes(PJB.PRINTERS, await this.service.printers(agent));
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && pnpm test print-jobs.agent`
Expected: PASS

- [ ] **Step 6: Verify against the running API**

```bash
docker exec orderium-postgres sh -c "psql -U \$POSTGRES_USER -d orderium_demo -tAc \"
INSERT INTO printers (name, brand, connection_type, warehouse_id, kind, paper_width, document_types, is_default, ip, port)
VALUES ('Plan2 Caisse','epson','network',1,'thermal',80,ARRAY['receipt'],true,'192.168.1.50',9100)
ON CONFLICT DO NOTHING;\""
# pair an agent as in Phase 1, then:
curl -s -H "X-Tenant-ID: demo" -H "X-Agent-Id: $AID" -H "Authorization: Bearer $KEY" \
  http://localhost:3000/api/print-jobs/agent/printers
```
Expected: JSON listing the printer with `ip`, `port` and `paperWidth`, and **no** `warehouseId`.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/printers api/src/common/response-codes.ts
git commit -m "feat(print): tell agents which device to write bytes to"
```

---

### Task 2: Package scaffold and config

**Files:**
- Create: `print-agent/package.json`, `print-agent/tsconfig.json`, `print-agent/.gitignore`
- Modify: `pnpm-workspace.yaml`
- Create: `print-agent/src/config.ts`
- Test: `print-agent/src/__tests__/config.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface AgentConfig { apiUrl: string; tenantSlug: string; agentId: string; agentKey: string; warehouseId: number }`
  - `configPath(): string`
  - `loadConfig(): Promise<AgentConfig | null>`
  - `saveConfig(c: AgentConfig): Promise<void>` — writes mode `0600`
  - `AGENT_VERSION: string`

- [ ] **Step 1: Create the package**

`print-agent/package.json`:

```json
{
  "name": "orderium-print-agent",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "bin": { "orderium-print-agent": "dist/index.js" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "pair": "ts-node src/index.ts pair"
  },
  "dependencies": {
    "eventsource": "^5.1.1",
    "pdf-to-printer": "^5.8.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.2"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$"
  }
}
```

`print-agent/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

`print-agent/.gitignore`: `dist/` and `node_modules/`.

Add `- 'print-agent'` to `pnpm-workspace.yaml`.

- [ ] **Step 2: Write the failing config tests**

`print-agent/src/__tests__/config.spec.ts`:

```ts
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, saveConfig, configPath, AgentConfig } from '../config';

const CONFIG: AgentConfig = {
  apiUrl: 'https://api.example.com',
  tenantSlug: 'acme',
  agentId: 'a1',
  agentKey: 'k'.repeat(64),
  warehouseId: 7,
};

describe('configPath', () => {
  it('is an absolute path under the user directory', () => {
    expect(path.isAbsolute(configPath())).toBe(true);
    expect(configPath()).toContain('orderium-print-agent');
  });
});

describe('loadConfig / saveConfig', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-'));
    process.env.ORDERIUM_AGENT_HOME = dir;
  });

  afterEach(async () => {
    delete process.env.ORDERIUM_AGENT_HOME;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns null before the agent is paired', async () => {
    await expect(loadConfig()).resolves.toBeNull();
  });

  it('round-trips a saved config', async () => {
    await saveConfig(CONFIG);
    await expect(loadConfig()).resolves.toEqual(CONFIG);
  });

  it('stores the key file readable only by its owner', async () => {
    await saveConfig(CONFIG);
    const stat = await fs.stat(configPath());
    // The file holds a long-lived credential.
    expect(stat.mode & 0o077).toBe(0);
  });

  it('returns null rather than throwing on a corrupt file', async () => {
    await fs.mkdir(path.dirname(configPath()), { recursive: true });
    await fs.writeFile(configPath(), 'not json');
    await expect(loadConfig()).resolves.toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd print-agent && pnpm install && pnpm test config`
Expected: FAIL — cannot find `../config`

- [ ] **Step 4: Implement config**

`print-agent/src/config.ts`:

```ts
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export const AGENT_VERSION = '1.0.0';

export interface AgentConfig {
  apiUrl: string;
  tenantSlug: string;
  agentId: string;
  agentKey: string;
  warehouseId: number;
}

/** Overridable via ORDERIUM_AGENT_HOME so tests never touch the real config. */
export function configPath(): string {
  const home = process.env.ORDERIUM_AGENT_HOME ?? os.homedir();
  return path.join(home, '.orderium-print-agent', 'config.json');
}

export async function loadConfig(): Promise<AgentConfig | null> {
  try {
    const raw = await fs.readFile(configPath(), 'utf8');
    return JSON.parse(raw) as AgentConfig;
  } catch {
    // Missing or corrupt: the caller re-pairs rather than crashing a service
    // that Windows/systemd will restart in a loop.
    return null;
  }
}

export async function saveConfig(config: AgentConfig): Promise<void> {
  const file = configPath();
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, JSON.stringify(config, null, 2), { mode: 0o600 });
  await fs.chmod(file, 0o600); // mkdir/writeFile modes are umask-dependent
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd print-agent && pnpm test config`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add print-agent pnpm-workspace.yaml
git commit -m "feat(agent): scaffold print-agent package with persisted config"
```

---

### Task 3: API client

**Files:**
- Create: `print-agent/src/api-client.ts`
- Test: `print-agent/src/__tests__/api-client.spec.ts`

**Interfaces:**
- Consumes: `AgentConfig` (Task 2)
- Produces:
  - `class ApiClient { constructor(config: AgentConfig) }`
  - `.pending(): Promise<PrintJobSummary[]>`
  - `.claim(jobId): Promise<'claimed' | 'lost'>`
  - `.payload(jobId): Promise<PrintPayload>`
  - `.report(jobId, result: {status:'done'|'failed'; durationMs: number; error?: string}): Promise<void>`
  - `.heartbeat(printers: {id: string; reachable: boolean}[]): Promise<void>`
  - `.printers(): Promise<DeviceTarget[]>`
  - `static pair(apiUrl, pairingString): Promise<AgentConfig>`
  - `interface PrintJobSummary { id: string; documentType: string }`
  - `interface DeviceTarget { printerId: string; connectionType: 'network'|'usb'|'system'; ip: string|null; port: number; systemName: string|null; paperWidth: 80|148 }`
  - `interface PrintPayload { kind: 'escpos'|'pdf'; dataBase64: string; fileName?: string; target: DeviceTarget }`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/api-client.spec.ts`:

```ts
import { ApiClient } from '../api-client';
import type { AgentConfig } from '../config';

const CONFIG: AgentConfig = {
  apiUrl: 'https://api.example.com',
  tenantSlug: 'acme',
  agentId: 'a1',
  agentKey: 'secret',
  warehouseId: 7,
};

const ok = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ code: 'X', status: 200, message: 'ok', data }),
});

describe('ApiClient headers', () => {
  it('identifies the tenant and the agent on every call', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok([]));
    global.fetch = fetchMock as never;

    await new ApiClient(CONFIG).pending();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/print-jobs/agent/pending');
    expect(init.headers).toMatchObject({
      'X-Tenant-ID': 'acme',
      'X-Agent-Id': 'a1',
      Authorization: 'Bearer secret',
    });
  });
});

describe('ApiClient.claim', () => {
  it('reports a won race', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ id: 'j1' })) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).resolves.toBe('claimed');
  });

  it('treats 409 as a lost race, not an error', async () => {
    // Another agent got there first. Normal, not exceptional.
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 409, json: async () => ({ message: 'taken' }),
    }) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).resolves.toBe('lost');
  });

  it('throws on a server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => ({ message: 'boom' }),
    }) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).rejects.toThrow(/500/);
  });
});

describe('ApiClient.pair', () => {
  it('derives the tenant slug from the pairing string', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ok({ agentId: 'a9', agentKey: 'k9', warehouseId: 3 }),
    ) as never;

    const config = await ApiClient.pair('https://api.example.com', 'acme-4F7K2Q9X');

    expect(config).toEqual({
      apiUrl: 'https://api.example.com',
      tenantSlug: 'acme',
      agentId: 'a9',
      agentKey: 'k9',
      warehouseId: 3,
    });
  });

  it('handles a tenant slug containing hyphens', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ok({ agentId: 'a9', agentKey: 'k9', warehouseId: 3 }),
    ) as never;
    const config = await ApiClient.pair('https://x', 'cafe-du-coin-4F7K2Q9X');
    expect(config.tenantSlug).toBe('cafe-du-coin');
  });

  it('surfaces an expired code clearly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ message: 'Invalid or expired pairing code' }),
    }) as never;
    await expect(ApiClient.pair('https://x', 'acme-BAD')).rejects.toThrow(/expired/i);
  });
});

describe('ApiClient.report', () => {
  it('posts the outcome to the result endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok(null));
    global.fetch = fetchMock as never;
    await new ApiClient(CONFIG).report('j1', { status: 'failed', durationMs: 5, error: 'no paper' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/print-jobs/agent/result/j1');
    expect(JSON.parse(init.body)).toEqual({ status: 'failed', durationMs: 5, error: 'no paper' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test api-client`
Expected: FAIL — cannot find `../api-client`

- [ ] **Step 3: Implement the client**

`print-agent/src/api-client.ts`:

```ts
import type { AgentConfig } from './config';

export interface PrintJobSummary {
  id: string;
  documentType: string;
}

export interface DeviceTarget {
  printerId: string;
  connectionType: 'network' | 'usb' | 'system';
  ip: string | null;
  port: number;
  systemName: string | null;
  paperWidth: 80 | 148;
}

export interface PrintPayload {
  kind: 'escpos' | 'pdf';
  dataBase64: string;
  fileName?: string;
  target: DeviceTarget;
}

export interface PrintResult {
  status: 'done' | 'failed';
  durationMs: number;
  error?: string;
}

interface Envelope<T> {
  code: string;
  status: number;
  message: string;
  data: T;
}

export class ApiClient {
  constructor(private readonly config: AgentConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantSlug,
      'X-Agent-Id': this.config.agentId,
      Authorization: `Bearer ${this.config.agentKey}`,
    };
  }

  private url(path: string): string {
    return `${this.config.apiUrl}/api${path}`;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const res = await fetch(this.url(path), {
      method: init.method ?? 'GET',
      headers: this.headers(),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`${res.status} ${body.message ?? res.statusText}`);
    }

    return ((await res.json()) as Envelope<T>).data;
  }

  async pending(): Promise<PrintJobSummary[]> {
    return this.request<PrintJobSummary[]>('/print-jobs/agent/pending');
  }

  /** 409 means another agent won the race — a normal outcome, not an error. */
  async claim(jobId: string): Promise<'claimed' | 'lost'> {
    const res = await fetch(this.url(`/print-jobs/agent/claim/${jobId}`), {
      method: 'POST',
      headers: this.headers(),
    });
    if (res.status === 409) return 'lost';
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`${res.status} ${body.message ?? res.statusText}`);
    }
    return 'claimed';
  }

  async payload(jobId: string): Promise<PrintPayload> {
    return this.request<PrintPayload>(`/print-jobs/agent/payload/${jobId}`);
  }

  async report(jobId: string, result: PrintResult): Promise<void> {
    await this.request<null>(`/print-jobs/agent/result/${jobId}`, {
      method: 'POST',
      body: result,
    });
  }

  async printers(): Promise<DeviceTarget[]> {
    return this.request<DeviceTarget[]>('/print-jobs/agent/printers');
  }

  async heartbeat(
    printers: { id: string; reachable: boolean }[],
  ): Promise<void> {
    const { AGENT_VERSION } = await import('./config');
    await this.request<null>('/print-agents/heartbeat', {
      method: 'POST',
      body: { version: AGENT_VERSION, platform: process.platform, printers },
    });
  }

  /**
   * Exchanges a pairing string for a permanent key.
   * The string is `<tenantSlug>-<code>`; the slug may itself contain hyphens,
   * so split on the LAST one.
   */
  static async pair(apiUrl: string, pairingString: string): Promise<AgentConfig> {
    const cut = pairingString.lastIndexOf('-');
    if (cut < 1) throw new Error('Pairing code must look like <tenant>-<code>');
    const tenantSlug = pairingString.slice(0, cut);

    const res = await fetch(`${apiUrl}/api/print-agents/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
      body: JSON.stringify({ pairingCode: pairingString }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Pairing failed (${res.status})`);
    }

    const { data } = (await res.json()) as Envelope<{
      agentId: string;
      agentKey: string;
      warehouseId: number;
    }>;

    return { apiUrl, tenantSlug, ...data };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd print-agent && pnpm test api-client`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add print-agent/src
git commit -m "feat(agent): API client with agent auth and 409-aware claim"
```

---

### Task 4: Device interface and TCP thermal printer

**Files:**
- Create: `print-agent/src/devices/index.ts`, `print-agent/src/devices/thermal-tcp.ts`
- Test: `print-agent/src/__tests__/thermal-tcp.spec.ts`

**Interfaces:**
- Consumes: `DeviceTarget` (Task 3)
- Produces:
  - `interface Device { print(bytes: Buffer, target: DeviceTarget, fileName?: string): Promise<void>; probe(target: DeviceTarget): Promise<boolean> }`
  - `class TcpThermalDevice implements Device`
  - `TCP_TIMEOUT_MS = 5000`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/thermal-tcp.spec.ts` — a real socket server stands in for the printer:

```ts
import * as net from 'net';
import { TcpThermalDevice } from '../devices/thermal-tcp';
import type { DeviceTarget } from '../api-client';

function fakePrinter(): Promise<{ port: number; received: Buffer[]; close: () => void }> {
  const received: Buffer[] = [];
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => received.push(chunk));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      resolve({ port, received, close: () => server.close() });
    });
  });
}

const target = (port: number): DeviceTarget => ({
  printerId: 'p1',
  connectionType: 'network',
  ip: '127.0.0.1',
  port,
  systemName: null,
  paperWidth: 80,
});

describe('TcpThermalDevice.print', () => {
  it('writes the exact bytes to the printer socket', async () => {
    const printer = await fakePrinter();
    const bytes = Buffer.from([0x1b, 0x40, 0x41, 0x42, 0x1d, 0x56, 0x41, 0x00]);

    await new TcpThermalDevice().print(bytes, target(printer.port));
    await new Promise((r) => setTimeout(r, 50));

    expect(Buffer.concat(printer.received)).toEqual(bytes);
    printer.close();
  });

  it('fails clearly when nothing is listening', async () => {
    // Port 1 is reserved and never has a listener.
    await expect(
      new TcpThermalDevice().print(Buffer.from('x'), target(1)),
    ).rejects.toThrow();
  });

  it('rejects a target with no IP', async () => {
    const t = { ...target(9100), ip: null };
    await expect(new TcpThermalDevice().print(Buffer.from('x'), t)).rejects.toThrow(/ip/i);
  });
});

describe('TcpThermalDevice.probe', () => {
  it('reports a listening printer as reachable', async () => {
    const printer = await fakePrinter();
    await expect(new TcpThermalDevice().probe(target(printer.port))).resolves.toBe(true);
    printer.close();
  });

  it('reports an absent printer as unreachable without throwing', async () => {
    await expect(new TcpThermalDevice().probe(target(1))).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test thermal-tcp`
Expected: FAIL — cannot find `../devices/thermal-tcp`

- [ ] **Step 3: Define the Device interface**

`print-agent/src/devices/index.ts`:

```ts
import type { DeviceTarget } from '../api-client';

/**
 * The only place OS- and transport-specific behaviour is allowed to live.
 * Nothing outside src/devices/ may branch on process.platform.
 */
export interface Device {
  /** Write finished bytes to the device. Throws on failure. */
  print(bytes: Buffer, target: DeviceTarget, fileName?: string): Promise<void>;
  /** Cheap liveness check for the heartbeat. Never throws. */
  probe(target: DeviceTarget): Promise<boolean>;
}
```

- [ ] **Step 4: Implement the TCP device**

`print-agent/src/devices/thermal-tcp.ts`:

```ts
import * as net from 'net';
import type { Device } from './index';
import type { DeviceTarget } from '../api-client';

export const TCP_TIMEOUT_MS = 5000;

/**
 * Nearly every network receipt printer accepts raw bytes on port 9100
 * (JetDirect). No library needed: the API has already produced the ESC/POS.
 */
export class TcpThermalDevice implements Device {
  print(bytes: Buffer, target: DeviceTarget): Promise<void> {
    if (!target.ip) {
      return Promise.reject(new Error('Network printer has no ip configured'));
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const fail = (err: Error) => {
        socket.destroy();
        reject(err);
      };

      socket.setTimeout(TCP_TIMEOUT_MS);
      socket.once('error', fail);
      socket.once('timeout', () => fail(new Error(`Timed out after ${TCP_TIMEOUT_MS}ms`)));

      socket.connect(target.port, target.ip, () => {
        socket.write(bytes, (err) => {
          if (err) return fail(err);
          // end() flushes; 'close' means the bytes left the machine.
          socket.end(() => resolve());
        });
      });
    });
  }

  probe(target: DeviceTarget): Promise<boolean> {
    if (!target.ip) return Promise.resolve(false);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const done = (reachable: boolean) => {
        socket.destroy();
        resolve(reachable);
      };
      socket.setTimeout(1500);
      socket.once('error', () => done(false));
      socket.once('timeout', () => done(false));
      socket.connect(target.port, target.ip!, () => done(true));
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd print-agent && pnpm test thermal-tcp`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add print-agent/src/devices print-agent/src/__tests__/thermal-tcp.spec.ts
git commit -m "feat(agent): TCP thermal device with zero dependencies"
```

---

### Task 5: OS spooler devices

Covers USB thermal printers (raw bytes to a named OS queue) and A4 documents (PDF to a queue). This is the only task that branches on `process.platform`.

**Files:**
- Create: `print-agent/src/devices/spooler.ts`
- Test: `print-agent/src/__tests__/spooler.spec.ts`

**Interfaces:**
- Consumes: `Device`, `DeviceTarget`
- Produces:
  - `class RawSpoolerDevice implements Device` — raw ESC/POS to a system queue
  - `class PdfSpoolerDevice implements Device` — PDF to a system queue
  - `buildRawCommand(platform: NodeJS.Platform, file: string, queue: string): { cmd: string; args: string[] }`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/spooler.spec.ts`:

```ts
import { buildRawCommand } from '../devices/spooler';

describe('buildRawCommand', () => {
  it('uses lp with raw mode on Linux', () => {
    const { cmd, args } = buildRawCommand('linux', '/tmp/j.bin', 'TM-T20');
    expect(cmd).toBe('lp');
    // Without -o raw, CUPS would try to interpret ESC/POS as text.
    expect(args).toEqual(['-d', 'TM-T20', '-o', 'raw', '/tmp/j.bin']);
  });

  it('uses lp with raw mode on macOS', () => {
    const { cmd, args } = buildRawCommand('darwin', '/tmp/j.bin', 'TM-T20');
    expect(cmd).toBe('lp');
    expect(args).toContain('raw');
  });

  it('uses PowerShell winspool on Windows, with no native module', () => {
    const { cmd, args } = buildRawCommand('win32', 'C:\\tmp\\j.bin', 'TM-T20');
    expect(cmd).toBe('powershell');
    const script = args.join(' ');
    expect(script).toContain('winspool.drv');
    expect(script).toContain('TM-T20');
  });

  it('refuses an unsupported platform rather than printing garbage', () => {
    expect(() => buildRawCommand('aix', '/tmp/j.bin', 'q')).toThrow(/aix/);
  });

  it('rejects a queue name containing shell metacharacters', () => {
    // Queue names come from the API; treat them as untrusted input.
    expect(() => buildRawCommand('linux', '/tmp/j.bin', 'q; rm -rf /')).toThrow(/queue name/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test spooler`
Expected: FAIL — cannot find `../devices/spooler`

- [ ] **Step 3: Implement the spooler devices**

`print-agent/src/devices/spooler.ts`:

```ts
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import type { Device } from './index';
import type { DeviceTarget } from '../api-client';

const run = promisify(execFile);

/** Queue names arrive from the API; never interpolate one unvalidated. */
const SAFE_QUEUE = /^[A-Za-z0-9 ._-]{1,120}$/;

export function buildRawCommand(
  platform: NodeJS.Platform,
  file: string,
  queue: string,
): { cmd: string; args: string[] } {
  if (!SAFE_QUEUE.test(queue)) {
    throw new Error(`Unsafe printer queue name: ${queue}`);
  }

  if (platform === 'linux' || platform === 'darwin') {
    // -o raw stops CUPS interpreting ESC/POS control codes as text.
    return { cmd: 'lp', args: ['-d', queue, '-o', 'raw', file] };
  }

  if (platform === 'win32') {
    // Windows has no raw print CLI. Add-Type compiles a tiny winspool.drv
    // P/Invoke shim at runtime, which avoids shipping a native Node module.
    const script = `
$ErrorActionPreference='Stop'
Add-Type -Namespace W -Name Spool -MemberDefinition @'
[DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
public static extern bool OpenPrinter(string src, out IntPtr h, IntPtr pd);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool ClosePrinter(IntPtr h);
[DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
public static extern bool StartDocPrinter(IntPtr h, int level, [In] ref DOCINFOA di);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndDocPrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool StartPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool WritePrinter(IntPtr h, IntPtr buf, int count, out int written);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
public struct DOCINFOA { public string pDocName; public string pOutputFile; public string pDataType; }
'@
$bytes=[System.IO.File]::ReadAllBytes('${file}')
$h=[IntPtr]::Zero
[void][W.Spool]::OpenPrinter('${queue}',[ref]$h,[IntPtr]::Zero)
$di=New-Object W.Spool+DOCINFOA
$di.pDocName='Orderium'; $di.pDataType='RAW'
[void][W.Spool]::StartDocPrinter($h,1,[ref]$di)
[void][W.Spool]::StartPagePrinter($h)
$p=[System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$p,$bytes.Length)
$w=0
[void][W.Spool]::WritePrinter($h,$p,$bytes.Length,[ref]$w)
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($p)
[void][W.Spool]::EndPagePrinter($h)
[void][W.Spool]::EndDocPrinter($h)
[void][W.Spool]::ClosePrinter($h)
`.trim();
    return {
      cmd: 'powershell',
      args: ['-NoProfile', '-NonInteractive', '-Command', script],
    };
  }

  throw new Error(`Raw printing is not supported on ${platform}`);
}

async function withTempFile<T>(
  bytes: Buffer,
  suffix: string,
  fn: (file: string) => Promise<T>,
): Promise<T> {
  const file = path.join(
    os.tmpdir(),
    `orderium-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`,
  );
  await fs.writeFile(file, bytes);
  try {
    return await fn(file);
  } finally {
    await fs.rm(file, { force: true });
  }
}

function queueOf(target: DeviceTarget): string {
  if (!target.systemName) {
    throw new Error('Printer has no systemName; set the OS queue name in settings');
  }
  return target.systemName;
}

/** Raw ESC/POS to a USB or otherwise OS-attached receipt printer. */
export class RawSpoolerDevice implements Device {
  async print(bytes: Buffer, target: DeviceTarget): Promise<void> {
    const queue = queueOf(target);
    await withTempFile(bytes, '.bin', async (file) => {
      const { cmd, args } = buildRawCommand(process.platform, file, queue);
      await run(cmd, args, { timeout: 30_000 });
    });
  }

  async probe(target: DeviceTarget): Promise<boolean> {
    try {
      const queue = queueOf(target);
      if (process.platform === 'win32') {
        await run('powershell', [
          '-NoProfile', '-NonInteractive', '-Command',
          `Get-Printer -Name '${queue}' | Out-Null`,
        ], { timeout: 10_000 });
      } else {
        await run('lpstat', ['-p', queue], { timeout: 10_000 });
      }
      return true;
    } catch {
      return false;
    }
  }
}

/** A4 documents: hand the PDF to the OS spooler. */
export class PdfSpoolerDevice implements Device {
  async print(bytes: Buffer, target: DeviceTarget, fileName?: string): Promise<void> {
    const queue = queueOf(target);
    await withTempFile(bytes, fileName?.endsWith('.pdf') ? '.pdf' : '.pdf', async (file) => {
      if (process.platform === 'win32') {
        const { print } = await import('pdf-to-printer');
        await print(file, { printer: queue });
      } else {
        if (!SAFE_QUEUE.test(queue)) throw new Error(`Unsafe printer queue name: ${queue}`);
        await run('lp', ['-d', queue, file], { timeout: 60_000 });
      }
    });
  }

  probe(target: DeviceTarget): Promise<boolean> {
    return new RawSpoolerDevice().probe(target);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd print-agent && pnpm test spooler`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add print-agent/src/devices/spooler.ts print-agent/src/__tests__/spooler.spec.ts
git commit -m "feat(agent): OS spooler devices for USB thermal and A4 documents"
```

---

### Task 6: Job runner

**Files:**
- Create: `print-agent/src/job-runner.ts`
- Test: `print-agent/src/__tests__/job-runner.spec.ts`

**Interfaces:**
- Consumes: `ApiClient`, `Device`, `DeviceTarget`, `PrintPayload`
- Produces:
  - `class JobRunner { constructor(api: ApiClient, devices: DeviceRegistry) }`
  - `.handle(jobId: string): Promise<'printed' | 'lost' | 'failed'>`
  - `interface DeviceRegistry { forTarget(target: DeviceTarget, kind: 'escpos'|'pdf'): Device }`
  - `class DefaultDeviceRegistry implements DeviceRegistry`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/job-runner.spec.ts`:

```ts
import { JobRunner } from '../job-runner';
import type { PrintPayload } from '../api-client';

const TARGET = {
  printerId: 'p1', connectionType: 'network' as const, ip: '127.0.0.1',
  port: 9100, systemName: null, paperWidth: 80 as const,
};

const PAYLOAD: PrintPayload = {
  kind: 'escpos',
  dataBase64: Buffer.from([0x1b, 0x40]).toString('base64'),
  target: TARGET,
};

function build(overrides: Partial<{
  claim: jest.Mock; payload: jest.Mock; report: jest.Mock; print: jest.Mock;
}> = {}) {
  const api = {
    claim: overrides.claim ?? jest.fn().mockResolvedValue('claimed'),
    payload: overrides.payload ?? jest.fn().mockResolvedValue(PAYLOAD),
    report: overrides.report ?? jest.fn().mockResolvedValue(undefined),
  };
  const print = overrides.print ?? jest.fn().mockResolvedValue(undefined);
  const devices = { forTarget: () => ({ print, probe: jest.fn() }) };
  return { runner: new JobRunner(api as never, devices as never), api, print };
}

describe('JobRunner.handle', () => {
  it('claims, fetches, prints and reports success', async () => {
    const { runner, api, print } = build();
    await expect(runner.handle('j1')).resolves.toBe('printed');

    expect(api.claim).toHaveBeenCalledWith('j1');
    expect(print).toHaveBeenCalledWith(
      Buffer.from([0x1b, 0x40]), TARGET, undefined,
    );
    expect(api.report).toHaveBeenCalledWith('j1', expect.objectContaining({ status: 'done' }));
  });

  it('stops quietly when another agent won the claim', async () => {
    const { runner, api, print } = build({ claim: jest.fn().mockResolvedValue('lost') });
    await expect(runner.handle('j1')).resolves.toBe('lost');
    expect(print).not.toHaveBeenCalled();
    expect(api.report).not.toHaveBeenCalled();
  });

  it('reports a device failure with its message', async () => {
    const { runner, api } = build({
      print: jest.fn().mockRejectedValue(new Error('out of paper')),
    });
    await expect(runner.handle('j1')).resolves.toBe('failed');
    expect(api.report).toHaveBeenCalledWith('j1', expect.objectContaining({
      status: 'failed', error: expect.stringContaining('out of paper'),
    }));
  });

  it('never retries the device itself — the API owns retry policy', async () => {
    const print = jest.fn().mockRejectedValue(new Error('boom'));
    const { runner } = build({ print });
    await runner.handle('j1');
    // A second write could produce a second physical receipt.
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('reports failure even when fetching the payload throws', async () => {
    const { runner, api } = build({
      payload: jest.fn().mockRejectedValue(new Error('500 boom')),
    });
    await expect(runner.handle('j1')).resolves.toBe('failed');
    expect(api.report).toHaveBeenCalledWith('j1', expect.objectContaining({ status: 'failed' }));
  });

  it('measures how long the print took', async () => {
    const { runner, api } = build();
    await runner.handle('j1');
    const [, result] = (api.report as jest.Mock).mock.calls[0];
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test job-runner`
Expected: FAIL — cannot find `../job-runner`

- [ ] **Step 3: Implement the runner**

`print-agent/src/job-runner.ts`:

```ts
import type { ApiClient, DeviceTarget, PrintPayload } from './api-client';
import type { Device } from './devices';
import { TcpThermalDevice } from './devices/thermal-tcp';
import { PdfSpoolerDevice, RawSpoolerDevice } from './devices/spooler';
import { log } from './logger';

export interface DeviceRegistry {
  forTarget(target: DeviceTarget, kind: PrintPayload['kind']): Device;
}

export class DefaultDeviceRegistry implements DeviceRegistry {
  private readonly tcp = new TcpThermalDevice();
  private readonly raw = new RawSpoolerDevice();
  private readonly pdf = new PdfSpoolerDevice();

  forTarget(target: DeviceTarget, kind: PrintPayload['kind']): Device {
    if (kind === 'pdf') return this.pdf;
    return target.connectionType === 'network' ? this.tcp : this.raw;
  }
}

export class JobRunner {
  constructor(
    private readonly api: ApiClient,
    private readonly devices: DeviceRegistry,
  ) {}

  /**
   * Runs one job to completion.
   *
   * Deliberately never retries the device write: a failed write may still have
   * emitted paper, and the API decides whether a job is safe to retry.
   */
  async handle(jobId: string): Promise<'printed' | 'lost' | 'failed'> {
    if ((await this.api.claim(jobId)) === 'lost') {
      log.debug(`Job ${jobId} claimed by another agent`);
      return 'lost';
    }

    const started = Date.now();
    try {
      const payload = await this.api.payload(jobId);
      const device = this.devices.forTarget(payload.target, payload.kind);
      await device.print(
        Buffer.from(payload.dataBase64, 'base64'),
        payload.target,
        payload.fileName,
      );

      await this.api.report(jobId, { status: 'done', durationMs: Date.now() - started });
      log.info(`Printed job ${jobId} in ${Date.now() - started}ms`);
      return 'printed';
    } catch (err) {
      const message = (err as Error).message;
      log.error(`Job ${jobId} failed: ${message}`);
      await this.api
        .report(jobId, { status: 'failed', durationMs: Date.now() - started, error: message })
        .catch((e) => log.error(`Could not report failure for ${jobId}: ${(e as Error).message}`));
      return 'failed';
    }
  }
}
```

- [ ] **Step 4: Create the logger it depends on**

`print-agent/src/logger.ts`:

```ts
type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 1;

/** Secrets must never reach a shop's log file. */
function redact(message: string): string {
  return message.replace(/Bearer\s+[A-Za-z0-9]+/g, 'Bearer [redacted]');
}

function emit(level: Level, message: string): void {
  if (ORDER[level] < threshold) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${redact(message)}`;
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

export const log = {
  debug: (m: string) => emit('debug', m),
  info: (m: string) => emit('info', m),
  warn: (m: string) => emit('warn', m),
  error: (m: string) => emit('error', m),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd print-agent && pnpm test job-runner`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add print-agent/src/job-runner.ts print-agent/src/logger.ts print-agent/src/__tests__/job-runner.spec.ts
git commit -m "feat(agent): job runner that never retries a device write"
```

---

### Task 7: Poller and SSE subscription

**Files:**
- Create: `print-agent/src/poller.ts`
- Test: `print-agent/src/__tests__/poller.spec.ts`

**Interfaces:**
- Consumes: `ApiClient`, `JobRunner`
- Produces:
  - `class Poller { constructor(api, runner, opts?: { sweepIntervalMs?: number }) }`
  - `.sweep(): Promise<number>` — returns jobs handled
  - `.start(): void` / `.stop(): Promise<void>`
  - `SWEEP_INTERVAL_MS = 30_000`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/poller.spec.ts`:

```ts
import { Poller } from '../poller';

function build(pending: unknown[], handle = jest.fn().mockResolvedValue('printed')) {
  const api = { pending: jest.fn().mockResolvedValue(pending) };
  const runner = { handle };
  return { poller: new Poller(api as never, runner as never), api, handle };
}

describe('Poller.sweep', () => {
  it('handles every queued job', async () => {
    const { poller, handle } = build([{ id: 'j1' }, { id: 'j2' }]);
    await expect(poller.sweep()).resolves.toBe(2);
    expect(handle).toHaveBeenCalledWith('j1');
    expect(handle).toHaveBeenCalledWith('j2');
  });

  it('processes jobs one at a time', async () => {
    // A shop has one printer; concurrent writes would interleave receipts.
    const order: string[] = [];
    const handle = jest.fn(async (id: string) => {
      order.push(`start:${id}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end:${id}`);
      return 'printed';
    });
    const { poller } = build([{ id: 'j1' }, { id: 'j2' }], handle as never);
    await poller.sweep();
    expect(order).toEqual(['start:j1', 'end:j1', 'start:j2', 'end:j2']);
  });

  it('keeps going when one job throws', async () => {
    const handle = jest.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('printed');
    const { poller } = build([{ id: 'j1' }, { id: 'j2' }], handle as never);
    await expect(poller.sweep()).resolves.toBe(1);
    expect(handle).toHaveBeenCalledTimes(2);
  });

  it('survives the API being unreachable', async () => {
    const api = { pending: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const poller = new Poller(api as never, { handle: jest.fn() } as never);
    await expect(poller.sweep()).resolves.toBe(0);
  });

  it('does not run two sweeps concurrently', async () => {
    const { poller, api } = build([]);
    await Promise.all([poller.sweep(), poller.sweep()]);
    expect(api.pending).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test poller`
Expected: FAIL — cannot find `../poller`

- [ ] **Step 3: Implement the poller**

`print-agent/src/poller.ts`:

```ts
import type { ApiClient } from './api-client';
import type { JobRunner } from './job-runner';
import { log } from './logger';

export const SWEEP_INTERVAL_MS = 30_000;

/**
 * The correctness guarantee.
 *
 * SSE reduces latency, but a dropped notification must never lose a job, so
 * the agent sweeps unconditionally on a timer as well.
 */
export class Poller {
  private timer?: NodeJS.Timeout;
  private sweeping = false;
  private stopped = false;

  constructor(
    private readonly api: ApiClient,
    private readonly runner: JobRunner,
    private readonly opts: { sweepIntervalMs?: number } = {},
  ) {}

  async sweep(): Promise<number> {
    // One shop, one printer: overlapping sweeps would interleave receipts.
    if (this.sweeping) return 0;
    this.sweeping = true;

    try {
      const jobs = await this.api.pending();
      let handled = 0;
      for (const job of jobs) {
        if (this.stopped) break;
        try {
          if ((await this.runner.handle(job.id)) === 'printed') handled++;
        } catch (err) {
          log.error(`Unexpected error on job ${job.id}: ${(err as Error).message}`);
        }
      }
      return handled;
    } catch (err) {
      log.warn(`Sweep failed: ${(err as Error).message}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }

  start(): void {
    this.stopped = false;
    void this.sweep();
    this.timer = setInterval(
      () => void this.sweep(),
      this.opts.sweepIntervalMs ?? SWEEP_INTERVAL_MS,
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    // Let an in-flight job finish rather than cutting a receipt in half.
    while (this.sweeping) await new Promise((r) => setTimeout(r, 50));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd print-agent && pnpm test poller`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the SSE subscription**

Append to `print-agent/src/poller.ts`:

```ts
import { EventSource } from 'eventsource';
import type { AgentConfig } from './config';

/**
 * Latency optimisation only. Every failure path here is a warning, never an
 * error: the sweep above still delivers the job within SWEEP_INTERVAL_MS.
 */
export class JobStream {
  private source?: EventSource;

  constructor(
    private readonly config: AgentConfig,
    private readonly onJob: (jobId: string) => void,
  ) {}

  start(): void {
    const url = `${this.config.apiUrl}/api/print-jobs/agent/stream`;

    this.source = new EventSource(url, {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            'X-Tenant-ID': this.config.tenantSlug,
            'X-Agent-Id': this.config.agentId,
            Authorization: `Bearer ${this.config.agentKey}`,
          },
        }),
    });

    this.source.onmessage = (event) => {
      try {
        const { jobId } = JSON.parse(event.data as string) as { jobId: string };
        if (jobId) this.onJob(jobId);
      } catch {
        log.warn('Ignoring malformed job notification');
      }
    };

    // EventSource reconnects on its own; log so a shop's outage is visible.
    this.source.onerror = () => log.warn('Job stream disconnected; will retry');
  }

  stop(): void {
    this.source?.close();
    this.source = undefined;
  }
}
```

- [ ] **Step 6: Verify the whole suite still passes**

Run: `cd print-agent && pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add print-agent/src/poller.ts print-agent/src/__tests__/poller.spec.ts
git commit -m "feat(agent): polling sweep as the guarantee, SSE as the optimisation"
```

---

### Task 8: Heartbeat

**Files:**
- Create: `print-agent/src/heartbeat.ts`
- Test: `print-agent/src/__tests__/heartbeat.spec.ts`

**Interfaces:**
- Consumes: `ApiClient`, `DeviceRegistry`
- Produces:
  - `class Heartbeat { constructor(api, devices, opts?: { intervalMs?: number }) }`
  - `.beat(): Promise<void>` · `.start(): void` · `.stop(): void`
  - `HEARTBEAT_INTERVAL_MS = 30_000`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/heartbeat.spec.ts`:

```ts
import { Heartbeat } from '../heartbeat';

const TARGET = {
  printerId: 'p1', connectionType: 'network' as const, ip: '127.0.0.1',
  port: 9100, systemName: null, paperWidth: 80 as const,
};

function build(probe: jest.Mock, printers = [TARGET]) {
  const api = {
    printers: jest.fn().mockResolvedValue(printers),
    heartbeat: jest.fn().mockResolvedValue(undefined),
  };
  const devices = { forTarget: () => ({ print: jest.fn(), probe }) };
  return { hb: new Heartbeat(api as never, devices as never), api };
}

describe('Heartbeat.beat', () => {
  it('reports each printer reachability', async () => {
    const { hb, api } = build(jest.fn().mockResolvedValue(true));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: true }]);
  });

  it('reports an unreachable printer as offline', async () => {
    const { hb, api } = build(jest.fn().mockResolvedValue(false));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: false }]);
  });

  it('treats a probe that throws as unreachable', async () => {
    const { hb, api } = build(jest.fn().mockRejectedValue(new Error('boom')));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: false }]);
  });

  it('still reports liveness when the printer list cannot be fetched', async () => {
    // The agent being alive is itself useful information.
    const api = {
      printers: jest.fn().mockRejectedValue(new Error('500')),
      heartbeat: jest.fn().mockResolvedValue(undefined),
    };
    const hb = new Heartbeat(api as never, { forTarget: jest.fn() } as never);
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([]);
  });

  it('does not throw when the API is unreachable', async () => {
    const api = {
      printers: jest.fn().mockResolvedValue([]),
      heartbeat: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const hb = new Heartbeat(api as never, { forTarget: jest.fn() } as never);
    await expect(hb.beat()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test heartbeat`
Expected: FAIL — cannot find `../heartbeat`

- [ ] **Step 3: Implement the heartbeat**

`print-agent/src/heartbeat.ts`:

```ts
import type { ApiClient } from './api-client';
import type { DeviceRegistry } from './job-runner';
import { log } from './logger';

/** Must be under the API's AGENT_ONLINE_WINDOW_MS (90s) with room for two misses. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

export class Heartbeat {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly api: ApiClient,
    private readonly devices: DeviceRegistry,
    private readonly opts: { intervalMs?: number } = {},
  ) {}

  async beat(): Promise<void> {
    let reachability: { id: string; reachable: boolean }[] = [];

    try {
      const printers = await this.api.printers();
      reachability = await Promise.all(
        printers.map(async (target) => ({
          id: target.printerId,
          reachable: await this.devices
            .forTarget(target, 'escpos')
            .probe(target)
            .catch(() => false),
        })),
      );
    } catch (err) {
      // Still send the beat: "the agent is alive" is useful on its own.
      log.warn(`Could not list printers: ${(err as Error).message}`);
    }

    try {
      await this.api.heartbeat(reachability);
    } catch (err) {
      log.warn(`Heartbeat failed: ${(err as Error).message}`);
    }
  }

  start(): void {
    void this.beat();
    this.timer = setInterval(
      () => void this.beat(),
      this.opts.intervalMs ?? HEARTBEAT_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd print-agent && pnpm test heartbeat`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add print-agent/src/heartbeat.ts print-agent/src/__tests__/heartbeat.spec.ts
git commit -m "feat(agent): heartbeat reporting liveness and printer reachability"
```

---

### Task 9: Entry point and pairing CLI

**Files:**
- Create: `print-agent/src/index.ts`
- Test: `print-agent/src/__tests__/index.spec.ts`

**Interfaces:**
- Consumes: everything above
- Produces:
  - `runPair(argv: string[]): Promise<number>` — exit code
  - `runAgent(): Promise<void>`
  - `main(argv: string[]): Promise<number>`

- [ ] **Step 1: Write the failing tests**

`print-agent/src/__tests__/index.spec.ts`:

```ts
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runPair } from '../index';
import { ApiClient } from '../api-client';
import { loadConfig } from '../config';

jest.mock('../api-client');

describe('runPair', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-'));
    process.env.ORDERIUM_AGENT_HOME = dir;
    jest.resetAllMocks();
  });

  afterEach(async () => {
    delete process.env.ORDERIUM_AGENT_HOME;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('saves the config returned by pairing', async () => {
    (ApiClient.pair as jest.Mock).mockResolvedValue({
      apiUrl: 'https://x', tenantSlug: 'acme',
      agentId: 'a1', agentKey: 'k', warehouseId: 7,
    });

    await expect(runPair(['pair', '--url', 'https://x', '--code', 'acme-ABC'])).resolves.toBe(0);
    await expect(loadConfig()).resolves.toMatchObject({ agentId: 'a1' });
  });

  it('exits non-zero when arguments are missing', async () => {
    await expect(runPair(['pair'])).resolves.toBe(1);
  });

  it('exits non-zero and saves nothing when pairing is rejected', async () => {
    (ApiClient.pair as jest.Mock).mockRejectedValue(new Error('Invalid or expired pairing code'));
    await expect(runPair(['pair', '--url', 'https://x', '--code', 'acme-BAD'])).resolves.toBe(1);
    await expect(loadConfig()).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd print-agent && pnpm test index`
Expected: FAIL — cannot find `../index`

- [ ] **Step 3: Implement the entry point**

`print-agent/src/index.ts`:

```ts
#!/usr/bin/env node
import { ApiClient } from './api-client';
import { AGENT_VERSION, loadConfig, saveConfig, configPath } from './config';
import { DefaultDeviceRegistry, JobRunner } from './job-runner';
import { Heartbeat } from './heartbeat';
import { JobStream, Poller } from './poller';
import { log } from './logger';

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

export async function runPair(argv: string[]): Promise<number> {
  const url = arg(argv, 'url');
  const code = arg(argv, 'code');

  if (!url || !code) {
    log.error('Usage: orderium-print-agent pair --url <apiUrl> --code <tenant-CODE>');
    return 1;
  }

  try {
    const config = await ApiClient.pair(url, code);
    await saveConfig(config);
    log.info(`Paired as agent ${config.agentId} for warehouse ${config.warehouseId}`);
    log.info(`Config written to ${configPath()}`);
    return 0;
  } catch (err) {
    log.error(`Pairing failed: ${(err as Error).message}`);
    return 1;
  }
}

export async function runAgent(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    log.error(`Not paired. Run: orderium-print-agent pair --url <apiUrl> --code <code>`);
    process.exit(1);
  }

  log.info(`Orderium print agent ${AGENT_VERSION} on ${process.platform}`);
  log.info(`Tenant ${config.tenantSlug}, warehouse ${config.warehouseId}`);

  const api = new ApiClient(config);
  const devices = new DefaultDeviceRegistry();
  const runner = new JobRunner(api, devices);
  const poller = new Poller(api, runner);
  const heartbeat = new Heartbeat(api, devices);
  const stream = new JobStream(config, (jobId) => {
    void runner.handle(jobId).catch((e) => log.error(`Job ${jobId}: ${(e as Error).message}`));
  });

  poller.start();
  heartbeat.start();
  stream.start();

  // Finish the job in hand before exiting, so no receipt is cut in half.
  const shutdown = async (signal: string) => {
    log.info(`${signal} received, shutting down`);
    stream.stop();
    heartbeat.stop();
    await poller.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export async function main(argv: string[]): Promise<number> {
  if (argv[0] === 'pair') return runPair(argv);
  await runAgent();
  return 0;
}

if (require.main === module) {
  void main(process.argv.slice(2)).then((code) => {
    if (code !== 0) process.exit(code);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd print-agent && pnpm test index`
Expected: PASS (3 tests)

- [ ] **Step 5: Pair against the real API and print to a fake printer**

```bash
# terminal 1 — a fake network printer that dumps what it receives
node -e "require('net').createServer(s=>s.on('data',d=>process.stdout.write(d))).listen(9100,()=>console.log('fake printer on 9100'))"

# terminal 2 — point a printer row at it, create an agent, pair, run
docker exec orderium-postgres sh -c "psql -U \$POSTGRES_USER -d orderium_demo -tAc \"
INSERT INTO printers (name, brand, connection_type, warehouse_id, kind, paper_width, document_types, is_default, ip, port)
VALUES ('Local Fake','epson','network',1,'thermal',80,ARRAY['receipt'],true,'127.0.0.1',9100);
INSERT INTO print_agents (name, warehouse_id, pairing_code, pairing_expires_at)
VALUES ('Dev Agent', 1, 'DEVCODE01', now() + interval '1 hour');\""

cd print-agent
pnpm ts-node src/index.ts pair --url http://localhost:3000 --code demo-DEVCODE01
pnpm ts-node src/index.ts
```

Then queue a job and watch terminal 1 print ESC/POS bytes:

```bash
docker exec orderium-postgres sh -c "psql -U \$POSTGRES_USER -d orderium_demo -tAc \"
INSERT INTO print_jobs (printer_id, warehouse_id, document_type, document_ref, idempotency_key, status)
SELECT id, 1, 'receipt', 1, 'agent-e2e-1', 'queued' FROM printers WHERE name='Local Fake';\""
```

Expected: within a second the agent logs `Printed job …`, terminal 1 shows the receipt bytes, and the job row reaches `done`.

- [ ] **Step 6: Clean up the test rows and commit**

```bash
docker exec orderium-postgres sh -c "psql -U \$POSTGRES_USER -d orderium_demo -tAc \"
DELETE FROM print_jobs WHERE idempotency_key like 'agent-e2e%';
DELETE FROM print_agents WHERE name='Dev Agent';
DELETE FROM printers WHERE name='Local Fake';\""

git add print-agent/src/index.ts print-agent/src/__tests__/index.spec.ts
git commit -m "feat(agent): entry point, pairing CLI and graceful shutdown"
```

---

### Task 10: Service installation and README

**Files:**
- Create: `print-agent/service/orderium-print-agent.service` (systemd)
- Create: `print-agent/service/com.orderium.printagent.plist` (launchd)
- Create: `print-agent/service/install-windows.ps1`
- Create: `print-agent/README.md`

**Interfaces:**
- Consumes: the built `dist/index.js`
- Produces: install instructions per platform. No new code interfaces.

- [ ] **Step 1: Verify the build produces a runnable artifact**

Run: `cd print-agent && pnpm build && node dist/index.js pair`
Expected: prints the usage line and exits 1 (proving the compiled entry point runs).

- [ ] **Step 2: Write the systemd unit**

`print-agent/service/orderium-print-agent.service`:

```ini
[Unit]
Description=Orderium Print Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=orderium
ExecStart=/usr/bin/node /opt/orderium-print-agent/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=append:/var/log/orderium-print-agent.log
StandardError=append:/var/log/orderium-print-agent.log

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: Write the launchd plist**

`print-agent/service/com.orderium.printagent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.orderium.printagent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/opt/orderium-print-agent/dist/index.js</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/usr/local/var/log/orderium-print-agent.log</string>
  <key>StandardErrorPath</key><string>/usr/local/var/log/orderium-print-agent.log</string>
</dict>
</plist>
```

- [ ] **Step 4: Write the Windows installer**

`print-agent/service/install-windows.ps1` — registers a service with the built-in Service Control Manager via `sc.exe`, wrapped by `nssm` if present, otherwise a Scheduled Task at boot (no third-party dependency required):

```powershell
#Requires -RunAsAdministrator
param(
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$ApiUrl,
  [Parameter(Mandatory=$true)][string]$PairingCode
)
$ErrorActionPreference = 'Stop'

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js is required. Install it from https://nodejs.org and re-run.' }

Write-Host 'Pairing agent...'
& $node "$InstallDir\dist\index.js" pair --url $ApiUrl --code $PairingCode
if ($LASTEXITCODE -ne 0) { throw 'Pairing failed. Check the code has not expired (15 minutes).' }

# A Scheduled Task at boot avoids depending on nssm while still surviving reboots.
$action  = New-ScheduledTaskAction -Execute $node -Argument "$InstallDir\dist\index.js"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'OrderiumPrintAgent' -Action $action -Trigger $trigger `
  -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force

Start-ScheduledTask -TaskName 'OrderiumPrintAgent'
Write-Host 'Orderium Print Agent installed and started.'
```

- [ ] **Step 5: Write the README**

`print-agent/README.md` must cover: what the agent is and why it exists (the browser cannot reach a printer); the three install paths; how to get a pairing code from the backoffice; where config and logs live per OS; how to tell whether it is running; and the three most likely support issues — expired pairing code, printer unreachable (TCP 9100 blocked), and `systemName` not set for USB/A4 queues.

- [ ] **Step 6: Verify the full suite and commit**

Run: `cd print-agent && pnpm test && pnpm build`
Expected: all tests pass, `dist/` produced.

```bash
git add print-agent
git commit -m "feat(agent): service definitions and operator README"
```

---

## Self-Review

**Spec coverage.** Agent package layout → Tasks 2–9; `Device` interface with TCP/USB/spooler → Tasks 4–5; SSE with reconnect → Task 7; polling sweep as guarantee → Task 7; job runner with claim/payload/print/report → Task 6; heartbeat with reachability → Task 8; pairing → Tasks 3, 9; cross-platform packaging → Task 10; local log file for phone support → Task 6 (`logger.ts`).

**Gap found and closed:** the spec assumed the agent knew its device addresses. It did not — Phase 1 exposed no printer details on agent routes. Task 1 adds `target` to the payload and `GET /print-jobs/agent/printers`.

**Deliberate deviations from the spec.**
- The agent contains **no ESC/POS builder** — the spec's file list included one, but Approach A puts rendering in the API, so `node-thermal-printer` is not a dependency at all. TCP printing is `net.Socket`.
- **`discovery.ts` is deferred.** The spec lists LAN discovery as the last item, explicitly cuttable. It is not in this plan; printers are configured by IP in the backoffice for now.
- Windows raw printing uses **PowerShell + winspool P/Invoke** rather than a native module, to keep installs free of node-gyp.
- Packaging ships **JS + Node**, not a single binary. Bundling is a follow-up once the agent has proven itself in one shop.

**Type consistency.** `DeviceTarget` is defined identically in Task 1 (API) and Task 3 (agent) and consumed unchanged in Tasks 4, 5, 6 and 8. `Device.print(bytes, target, fileName?)` in Task 4 matches the call in Task 6. `DeviceRegistry.forTarget(target, kind)` is produced in Task 6 and consumed in Task 8. `AgentConfig` from Task 2 is consumed by Tasks 3, 7 and 9. `log` from Task 6 is used in Tasks 6, 7, 8 and 9 — it is created in Task 6 Step 4, which precedes every use.
