# Print Agent — API Foundation Implementation Plan (Phases 0 + 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side print job queue, agent authentication and ESC/POS rendering that a local print agent will consume, and make today's browser printing honest in the meantime.

**Architecture:** `print_jobs` becomes a durable queue in each tenant database. The API renders ESC/POS itself (thin-agent model) and hands bytes to an authenticated agent that claims jobs. Agents are notified by SSE fanned out over Redis, but a polling sweep is the correctness guarantee. Jobs already sent to a device are never auto-retried.

**Tech Stack:** NestJS 10, TypeORM, PostgreSQL (per-tenant DBs), Redis/ioredis (already present via BullMQ), `@nestjs/schedule`, argon2, Jest.

**Spec:** `docs/superpowers/specs/2026-09-09-print-agent-design.md`

**Out of scope for this plan:** the `print-agent` package itself (Plan 2) and the frontend switch to agent printing (Plan 3).

## Global Constraints

- Package manager is **pnpm**. Never `npm install` / `yarn`.
- All business data is tenant-scoped. **Never** inject `Repository<Entity>` directly — use a getter: `private get repo() { return this.tenantConnService.getRepository(X); }`
- Every controller method returns `ApiRes(CODE, data)` and carries `@ApiOperation` + `@ApiResponse`.
- Response codes are declared in `api/src/common/response-codes.ts` **before** use. Format `PREFIX + HTTP_STATUS + "_" + SEQUENCE`.
- `PRT` is **taken** (Portal). Printers use `PRI`, print jobs use `PJB`, agents use the new `PAG`.
- Money/decimal columns use `numericTransformer`.
- Never enable TypeORM `synchronize`. Schema changes ship as migrations.
- Tenant tables migrate with **`pnpm migration:run:all`** (`src/scripts/migrate-all-tenants.ts`), or `pnpm migration:run:tenant=<slug>`. Plain `migration:run` targets one data source only and will silently miss tenants.
- No `console.log` in API code — use NestJS `Logger`.
- `PartialType` comes from `@nestjs/swagger`, never `@nestjs/mapped-types`.
- Migration filenames: `src/database/migrations/<epoch>-<Name>.ts`, class `Name<epoch>`.
- Tests are `*.spec.ts` under `src/`, run with `pnpm test` from `api/`.
- Permissions reuse the existing `printers` access module (`view/create/edit/delete/print`).

---

### Task 1: Make browser printing honest (Phase 0)

Today `printReceipt()` advertises four transports; three cannot work over HTTPS (mixed content), so every print silently falls through to `window.print()`. This task removes the pretence. No agent exists yet, so the browser dialog remains the real path — it just becomes visible and correctly formatted.

**Files:**
- Modify: `shared/components/PrintManager.ts` (delete `viaEpsonEpos`, `viaStarWebPRNT`, `viaQzTray`, `discoverPrinters`, `probeHttp`)
- Modify: `shared/components/PrintableReceipt.tsx` (print CSS)
- Modify: `backoffice/src/pages/configurations/Printers.tsx` (remove the discovery UI)

**Interfaces:**
- Consumes: nothing
- Produces: `printReceipt(config, data): Promise<PrintResult>` with `method: 'browser'` always; `ReceiptData`, `ReceiptLine`, `PrinterConfig` types unchanged (Task 2 re-uses their shape server-side).

- [ ] **Step 1: Reduce `printReceipt` to the one path that works**

Replace the strategy chain in `shared/components/PrintManager.ts` with:

```ts
export async function printReceipt(
    _config: PrinterConfig,
    _data: ReceiptData,
): Promise<PrintResult> {
    const started = Date.now();
    window.print();
    return { method: 'browser', status: 'success', durationMs: Date.now() - started };
}
```

Delete `viaEpsonEpos`, `viaStarWebPRNT`, `viaQzTray`, `discoverPrinters`, `probeHttp`, and the `DiscoveredPrinter` interface. Keep `buildEscPos` for now — Task 2 ports it to the API, and it is deleted here in Plan 3.

- [ ] **Step 2: Add receipt print CSS**

In `shared/components/PrintableReceipt.tsx`, ensure the portal renders a `<style>` with:

```css
@media print {
  @page { size: 80mm auto; margin: 0; }
  body > *:not(#morocom-receipt) { display: none !important; }
  #morocom-receipt { width: 80mm; font-family: monospace; font-size: 11px; }
}
```

- [ ] **Step 3: Remove the dead discovery UI**

In `backoffice/src/pages/configurations/Printers.tsx` delete `handleScan`, `handleAddDiscovered`, `showDiscovery`, `discoverySubnet`, `isScanning`, `discovered`, `discoveredSeed` and the scan modal markup. Remove the now-unused `discoverPrinters` / `DiscoveredPrinter` imports. Leave the printer list, form, document-type assignment and history tab untouched — Plan 3 rebuilds discovery on top of the agent.

- [ ] **Step 4: Verify both apps build**

Run: `pnpm --filter backoffice build && pnpm --filter client build && pnpm --filter delivery-portal build`
Expected: all succeed, no unused-import or missing-export errors.

- [ ] **Step 5: Commit**

```bash
git add shared/components/PrintManager.ts shared/components/PrintableReceipt.tsx backoffice/src/pages/configurations/Printers.tsx
git commit -m "refactor(print): remove browser transports blocked by mixed content"
```

---

### Task 2: ESC/POS renderer in the API

Moves receipt rendering server-side (the thin-agent decision). Pure functions, so this is where formatting is locked down cheaply with golden tests.

**Files:**
- Create: `api/src/modules/printers/escpos/receipt.types.ts`
- Create: `api/src/modules/printers/escpos/escpos.renderer.ts`
- Test: `api/src/modules/printers/escpos/__tests__/escpos.renderer.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface ReceiptLine { name: string; qty: number; unitPrice: number; total: number }`
  - `interface ReceiptData { storeName: string; storePhone?: string; orderNumber: string; date: string; clientName: string; clientPhone?: string; items: ReceiptLine[]; subtotal: number; discount?: number; total: number; footer?: string }`
  - `interface RenderOptions { paperWidth: 80 | 148; brand: 'epson' | 'star' | 'generic' }`
  - `renderEscPos(data: ReceiptData, opts: RenderOptions): Buffer`

- [ ] **Step 1: Write the failing tests**

Create `api/src/modules/printers/escpos/__tests__/escpos.renderer.spec.ts`:

```ts
import { renderEscPos } from '../escpos.renderer';
import type { ReceiptData } from '../receipt.types';

const data: ReceiptData = {
  storeName: 'Café Atlas',
  storePhone: '0522-000000',
  orderNumber: 'CMD-0001',
  date: '2026-09-09 14:32',
  clientName: 'Yassine',
  items: [{ name: 'Coca 33cl', qty: 2, unitPrice: 6, total: 12 }],
  subtotal: 12,
  total: 12,
};

describe('renderEscPos', () => {
  it('starts with the ESC/POS init sequence', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
  });

  it('pads item rows to 48 columns on 80mm paper', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' }).toString('binary');
    const row = out.split('\n').find((l) => l.includes('2 x 6.00'));
    expect(row).toHaveLength(48);
  });

  it('pads item rows to 64 columns on 148mm paper', () => {
    const out = renderEscPos(data, { paperWidth: 148, brand: 'epson' }).toString('binary');
    const row = out.split('\n').find((l) => l.includes('2 x 6.00'));
    expect(row).toHaveLength(64);
  });

  it('ends with a cut command', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.subarray(-4)).toEqual(Buffer.from([0x1d, 0x56, 0x41, 0x00]));
  });

  it('uses the Star cut sequence for star printers', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'star' });
    expect(out.subarray(-2)).toEqual(Buffer.from([0x1b, 0x64]));
  });

  it('renders a stable golden receipt', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.toString('hex')).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && pnpm test escpos.renderer`
Expected: FAIL — `Cannot find module '../escpos.renderer'`

- [ ] **Step 3: Write the types**

Create `api/src/modules/printers/escpos/receipt.types.ts`:

```ts
export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  storeName: string;
  storePhone?: string;
  orderNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  items: ReceiptLine[];
  subtotal: number;
  discount?: number;
  total: number;
  footer?: string;
}

export interface RenderOptions {
  paperWidth: 80 | 148;
  brand: 'epson' | 'star' | 'generic';
}
```

- [ ] **Step 4: Implement the renderer**

Create `api/src/modules/printers/escpos/escpos.renderer.ts`. This ports `buildEscPos` from `shared/components/PrintManager.ts` and adds the brand dialect:

```ts
import type { ReceiptData, RenderOptions } from './receipt.types';

const ESC = '\x1B';
const GS = '\x1D';

/** Cut sequences differ by manufacturer. */
function cutSequence(brand: RenderOptions['brand']): string {
  return brand === 'star' ? `${ESC}\x64` : `${GS}\x56\x41\x00`;
}

export function renderEscPos(data: ReceiptData, opts: RenderOptions): Buffer {
  const W = opts.paperWidth === 148 ? 64 : 48;
  const row = (l: string, r: string) => l.padEnd(W - r.length) + r + '\n';

  const parts: string[] = [
    `${ESC}\x40`,
    `${ESC}\x61\x01`,
    `${ESC}\x21\x30`,
    data.storeName + '\n',
    `${ESC}\x21\x00`,
    ...(data.storePhone ? [data.storePhone + '\n'] : []),
    '='.repeat(W) + '\n',
    `${ESC}\x61\x00`,
    `Commande : ${data.orderNumber}\n`,
    `Date     : ${data.date}\n`,
    `Client   : ${data.clientName}\n`,
    ...(data.clientPhone ? [`Tél      : ${data.clientPhone}\n`] : []),
    '-'.repeat(W) + '\n',
    ...data.items.flatMap((item) => [
      item.name + '\n',
      row(`  ${item.qty} x ${item.unitPrice.toFixed(2)} DH`, `${item.total.toFixed(2)} DH`),
    ]),
    '='.repeat(W) + '\n',
    `${ESC}\x61\x02`,
    `${ESC}\x45\x01`,
    row('TOTAL :', `${data.total.toFixed(2)} DH`),
    `${ESC}\x45\x00`,
    `${ESC}\x61\x01`,
    '\n' + (data.footer ?? 'Merci pour votre confiance !') + '\n',
    `${ESC}\x64\x04`,
    cutSequence(opts.brand),
  ];

  return Buffer.from(parts.join(''), 'binary');
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd api && pnpm test escpos.renderer`
Expected: PASS (6 tests, 1 snapshot written)

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/printers/escpos
git commit -m "feat(print): render ESC/POS receipts server-side"
```

---

### Task 2b: Repair the missing printers tables (inserted during execution)

Discovered while executing: `CreatePrinters1743120000000` returns early when
`portal` is absent and is still recorded as applied, so `printers` and
`print_jobs` exist in no tenant database. Tasks 3 and 4 cannot ALTER tables that
do not exist.

**Files:** Create `api/src/database/migrations/1777900000000-RepairPrintersTables.ts`

- [x] Idempotent `CREATE TABLE IF NOT EXISTS` for both tables
- [x] Widen `paper_width` CHECK from (58,80,210) to (58,80,148,210) to match the entity
- [x] Verified applied via `docker exec orderium-api-dev pnpm migration:run:all`

Note: tenant records store `databaseHost: orderium-postgres`, a Docker-internal
hostname. Migrations must be run **inside** the API container:
`docker exec orderium-api-dev sh -c 'cd /app && pnpm migration:run:all'`

---

### Task 3: Schema — printers gains warehouse, kind and systemName

**Files:**
- Create: `api/src/database/migrations/1778000000000-PrintersWarehouseAndKind.ts`
- Modify: `api/src/modules/printers/entities/printer.entity.ts`
- Modify: `api/src/modules/printers/dto/create-printer.dto.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Printer` entity with `warehouseId: number`, `kind: PrinterKind`, `systemName: string | null`; types `PrinterKind = 'thermal' | 'document'`, `PrinterBrand = 'epson' | 'star' | 'generic'`, `ConnectionType = 'network' | 'usb' | 'system'`.

- [ ] **Step 1: Write the migration**

Create `api/src/database/migrations/1778000000000-PrintersWarehouseAndKind.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ties printers to a warehouse (a physical shop) and separates device kind
 * from manufacturer. `brand` previously mixed transports ('qztray', 'browser')
 * with real manufacturers; those transports no longer exist.
 */
export class PrintersWarehouseAndKind1778000000000 implements MigrationInterface {
  name = 'PrintersWarehouseAndKind1778000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE printers ADD COLUMN warehouse_id integer`);
    await q.query(`ALTER TABLE printers ADD COLUMN kind varchar(20) NOT NULL DEFAULT 'thermal'`);
    await q.query(`ALTER TABLE printers ADD COLUMN system_name varchar(120)`);

    // Backfill: existing printers belong to the tenant's first warehouse.
    await q.query(`
      UPDATE printers SET warehouse_id = (SELECT id FROM warehouses ORDER BY id LIMIT 1)
      WHERE warehouse_id IS NULL
    `);
    await q.query(`UPDATE printers SET kind = CASE WHEN paper_width = 80 THEN 'thermal' ELSE 'document' END`);
    await q.query(`UPDATE printers SET brand = 'generic' WHERE brand IN ('qztray', 'browser')`);
    await q.query(`UPDATE printers SET connection_type = 'network' WHERE connection_type IN ('wifi', 'browser')`);

    await q.query(`
      ALTER TABLE printers
        ADD CONSTRAINT fk_printers_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    `);

    // A printer name is unique per shop, not per tenant.
    await q.query(`DROP INDEX IF EXISTS "IDX_printers_name"`);
    await q.query(`CREATE UNIQUE INDEX idx_printers_warehouse_name ON printers (warehouse_id, name)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_printers_warehouse_name`);
    await q.query(`ALTER TABLE printers DROP CONSTRAINT IF EXISTS fk_printers_warehouse`);
    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS system_name`);
    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS kind`);
    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS warehouse_id`);
    await q.query(`CREATE UNIQUE INDEX "IDX_printers_name" ON printers (name)`);
  }
}
```

- [ ] **Step 2: Update the entity**

In `api/src/modules/printers/entities/printer.entity.ts`, narrow the union types and add the columns:

```ts
export type PrinterBrand = 'epson' | 'star' | 'generic';
export type ConnectionType = 'network' | 'usb' | 'system';
export type PrinterKind = 'thermal' | 'document';
```

Replace `@Index(['name'], { unique: true })` on the class with `@Index(['warehouseId', 'name'], { unique: true })`, and add:

```ts
  // Nullable: a tenant with no warehouses leaves existing printers unassigned.
  // PrintJobsDispatchService refuses to queue to a printer without a warehouse.
  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'varchar', length: 20, default: 'thermal' })
  kind: PrinterKind;

  @Column({ name: 'system_name', type: 'varchar', length: 120, nullable: true })
  systemName: string | null;
```

- [ ] **Step 3: Update the create DTO**

In `api/src/modules/printers/dto/create-printer.dto.ts` add validated fields mirroring the entity — `@IsInt() warehouseId`, `@IsIn(['thermal','document']) kind`, `@IsOptional() @IsString() @MaxLength(120) systemName` — and narrow the existing `brand` / `connectionType` `@IsIn` lists to the new unions. Keep `@ApiProperty` on each.

- [ ] **Step 4: Run the migration against a dev tenant**

Run: `cd api && pnpm migration:run:all`
Expected: migration applies to every tenant database; `\d printers` shows `warehouse_id`, `kind`, `system_name` and the new unique index.

- [ ] **Step 5: Verify rollback works**

Run: `cd api && pnpm migration:revert -- -d src/database/data-source.ts && pnpm migration:run:all`
Expected: both succeed. A migration that cannot be reverted is not shippable.

- [ ] **Step 6: Commit**

```bash
git add api/src/database/migrations/1778000000000-PrintersWarehouseAndKind.ts api/src/modules/printers/entities/printer.entity.ts api/src/modules/printers/dto/create-printer.dto.ts
git commit -m "feat(print): scope printers to a warehouse and split kind from brand"
```

---

### Task 4: Schema — print_jobs becomes a queue

**Files:**
- Create: `api/src/database/migrations/1778000100000-PrintJobsQueue.ts`
- Modify: `api/src/modules/printers/entities/print-job.entity.ts`

**Interfaces:**
- Consumes: `Printer` from Task 3
- Produces: `PrintJob` entity with `status: PrintJobStatus`, `warehouseId`, `agentId`, `idempotencyKey`, `attempts`, `maxAttempts`, `lastError`, `queuedAt`, `claimedAt`, `completedAt`, `documentRef`; type `PrintJobStatus = 'queued' | 'claimed' | 'printing' | 'done' | 'failed' | 'cancelled'`.

- [ ] **Step 1: Write the migration**

Create `api/src/database/migrations/1778000100000-PrintJobsQueue.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns print_jobs from a write-only audit log into the durable queue.
 *
 * document_id was uuid but every document in this system uses integer ids,
 * so a new integer column `document_ref` is added and historical rows keep a
 * null ref rather than losing their history. `method` is retained nullable so
 * existing history stays readable; it is no longer written.
 */
export class PrintJobsQueue1778000100000 implements MigrationInterface {
  name = 'PrintJobsQueue1778000100000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE print_jobs ADD COLUMN warehouse_id integer`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN agent_id uuid`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN document_ref integer`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN idempotency_key varchar(200)`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN attempts integer NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN max_attempts integer NOT NULL DEFAULT 3`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN last_error text`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN queued_at timestamptz NOT NULL DEFAULT now()`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN claimed_at timestamptz`);
    await q.query(`ALTER TABLE print_jobs ADD COLUMN completed_at timestamptz`);

    // Historical rows are terminal.
    await q.query(`UPDATE print_jobs SET status = 'done' WHERE status IN ('success', 'fallback')`);
    await q.query(`UPDATE print_jobs SET completed_at = printed_at WHERE completed_at IS NULL`);
    await q.query(`UPDATE print_jobs SET idempotency_key = 'legacy-' || id WHERE idempotency_key IS NULL`);

    await q.query(`ALTER TABLE print_jobs ALTER COLUMN idempotency_key SET NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX idx_print_jobs_idempotency ON print_jobs (idempotency_key)`);
    await q.query(`CREATE INDEX idx_print_jobs_dispatch ON print_jobs (warehouse_id, status, queued_at)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_print_jobs_dispatch`);
    await q.query(`DROP INDEX IF EXISTS idx_print_jobs_idempotency`);
    for (const col of ['completed_at','claimed_at','queued_at','last_error','max_attempts','attempts','idempotency_key','document_ref','agent_id','warehouse_id']) {
      await q.query(`ALTER TABLE print_jobs DROP COLUMN IF EXISTS ${col}`);
    }
    await q.query(`UPDATE print_jobs SET status = 'success' WHERE status = 'done'`);
  }
}
```

- [ ] **Step 2: Update the entity**

In `api/src/modules/printers/entities/print-job.entity.ts` replace `PrintStatus` with:

```ts
export type PrintJobStatus =
  | 'queued' | 'claimed' | 'printing' | 'done' | 'failed' | 'cancelled';
```

Keep `method` as `@Column({ type:'varchar', length:30, nullable:true }) method: string | null` (legacy, no longer written) and add columns for every field introduced by the migration, using `@Column({ name: 'snake_case', ... })` to match.

- [ ] **Step 3: Verify migration up and down**

Run: `cd api && pnpm migration:run:all`, then verify revert on a single tenant with `pnpm migration:revert -- -d src/database/data-source.ts`, then `pnpm migration:run:all` again.
Expected: all succeed.

- [ ] **Step 4: Commit**

```bash
git add api/src/database/migrations/1778000100000-PrintJobsQueue.ts api/src/modules/printers/entities/print-job.entity.ts
git commit -m "feat(print): turn print_jobs into a durable queue"
```

---

### Task 5: Schema — print_agents

**Files:**
- Create: `api/src/database/migrations/1778000200000-CreatePrintAgents.ts`
- Create: `api/src/modules/printers/entities/print-agent.entity.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `PrintAgent` entity with `id`, `name`, `warehouseId`, `keyHash`, `keyPrefix`, `pairingCode`, `pairingExpiresAt`, `lastSeenAt`, `version`, `platform`, `isEnabled`, `revokedAt`.

- [ ] **Step 1: Write the migration**

Create `api/src/database/migrations/1778000200000-CreatePrintAgents.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/** One print agent per shop machine. Keys are stored hashed; the plaintext
 *  key is shown to the operator once at pairing time and never persisted. */
export class CreatePrintAgents1778000200000 implements MigrationInterface {
  name = 'CreatePrintAgents1778000200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE print_agents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(60) NOT NULL,
        warehouse_id integer NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        key_hash text,
        key_prefix varchar(8),
        pairing_code varchar(40),
        pairing_expires_at timestamptz,
        last_seen_at timestamptz,
        version varchar(20),
        platform varchar(20),
        is_enabled boolean NOT NULL DEFAULT true,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX idx_print_agents_warehouse_name ON print_agents (warehouse_id, name)`);
    await q.query(`CREATE UNIQUE INDEX idx_print_agents_pairing ON print_agents (pairing_code) WHERE pairing_code IS NOT NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS print_agents`);
  }
}
```

- [ ] **Step 2: Create the entity**

Create `api/src/modules/printers/entities/print-agent.entity.ts` mirroring the table, with `@Entity('print_agents')`, `@PrimaryGeneratedColumn('uuid')`, and `@Column({ name: 'snake_case' })` on every field. `keyHash` and `pairingCode` must be declared `{ select: false }` so they never leak through a plain `find()`.

- [ ] **Step 3: Verify migration up and down**

Run: `cd api && pnpm migration:run:all`, then verify revert on a single tenant, then re-run `pnpm migration:run:all`.
Expected: all succeed.

- [ ] **Step 4: Commit**

```bash
git add api/src/database/migrations/1778000200000-CreatePrintAgents.ts api/src/modules/printers/entities/print-agent.entity.ts
git commit -m "feat(print): add print_agents table"
```

---

### Task 6: Agent authentication

**Files:**
- Create: `api/src/modules/auth/decorators/agent-route.decorator.ts`
- Create: `api/src/modules/auth/guards/agent-auth.guard.ts`
- Modify: `api/src/modules/auth/guards/jwt-auth.guard.ts`
- Test: `api/src/modules/auth/__tests__/agent-auth.guard.spec.ts`

**Interfaces:**
- Consumes: `PrintAgent` (Task 5)
- Produces:
  - `AgentRoute()` decorator, `IS_AGENT_ROUTE_KEY = 'isAgentRoute'`
  - `AgentAuthGuard` — attaches `req.agent: { id: string; warehouseId: number }`
  - `CurrentAgent()` param decorator returning that object

- [ ] **Step 1: Write the failing guard tests**

Create `api/src/modules/auth/__tests__/agent-auth.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { AgentAuthGuard } from '../guards/agent-auth.guard';

const ctx = (headers: Record<string, string>) => {
  const req: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __req: req,
  } as any;
};

describe('AgentAuthGuard', () => {
  const agent = { id: 'a1', warehouseId: 7, keyHash: 'hash', isEnabled: true, revokedAt: null };
  let guard: AgentAuthGuard;
  let repo: { findOne: jest.Mock };
  let verify: jest.Mock;

  beforeEach(() => {
    repo = { findOne: jest.fn().mockResolvedValue(agent) };
    verify = jest.fn().mockResolvedValue(true);
    guard = new AgentAuthGuard(
      { getRepository: () => repo } as any,
      { getAllAndOverride: () => true } as any,
      { verify } as any,
    );
  });

  it('rejects a request with no key', async () => {
    await expect(guard.canActivate(ctx({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a revoked agent', async () => {
    repo.findOne.mockResolvedValue({ ...agent, revokedAt: new Date() });
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer k', 'x-agent-id': 'a1' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong key', async () => {
    verify.mockResolvedValue(false);
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer bad', 'x-agent-id': 'a1' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the agent on success', async () => {
    const c = ctx({ authorization: 'Bearer k', 'x-agent-id': 'a1' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(c.__req.agent).toEqual({ id: 'a1', warehouseId: 7 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test agent-auth.guard`
Expected: FAIL — cannot find `../guards/agent-auth.guard`

- [ ] **Step 3: Add the decorator**

Create `api/src/modules/auth/decorators/agent-route.decorator.ts`, mirroring `portal-route.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_AGENT_ROUTE_KEY = 'isAgentRoute';
/** Marks a route as authenticated by a print-agent key rather than a JWT.
 *  The global JwtAuthGuard skips these; AgentAuthGuard validates them. */
export const AgentRoute = () => SetMetadata(IS_AGENT_ROUTE_KEY, true);
```

- [ ] **Step 4: Let the global JWT guard skip agent routes**

In `api/src/modules/auth/guards/jwt-auth.guard.ts`, immediately after the `isPublic` early return, add the same shape for `IS_AGENT_ROUTE_KEY`:

```ts
    const isAgentRoute = this.reflector.getAllAndOverride<boolean>(
      IS_AGENT_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAgentRoute) {
      return true; // AgentAuthGuard authenticates these
    }
```

- [ ] **Step 5: Implement the guard**

Create `api/src/modules/auth/guards/agent-auth.guard.ts`. It reads `x-agent-id` and the bearer key, loads the agent from the **tenant** database (resolved by the existing `TenantMiddleware` from `X-Tenant-ID`), and verifies the argon2 hash:

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as argon2 from 'argon2';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { PrintAgent } from '../../printers/entities/print-agent.entity';

export interface AuthenticatedAgent { id: string; warehouseId: number }

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly reflector: Reflector,
    private readonly hasher: { verify: (hash: string, plain: string) => Promise<boolean> } = argon2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const agentId = req.headers['x-agent-id'] as string | undefined;
    const key = (req.headers['authorization'] as string | undefined)?.replace(/^Bearer /, '');
    if (!agentId || !key) throw new UnauthorizedException('Missing agent credentials');

    const repo = this.tenantConnService.getRepository(PrintAgent);
    const agent = await repo.findOne({
      where: { id: agentId },
      select: ['id', 'warehouseId', 'keyHash', 'isEnabled', 'revokedAt'],
    });

    if (!agent || !agent.isEnabled || agent.revokedAt || !agent.keyHash) {
      throw new UnauthorizedException('Unknown or revoked agent');
    }
    if (!(await this.hasher.verify(agent.keyHash, key))) {
      throw new UnauthorizedException('Invalid agent key');
    }

    req.agent = { id: agent.id, warehouseId: agent.warehouseId };
    return true;
  }
}
```

Also create `CurrentAgent` in the same file's module folder:

```ts
export const CurrentAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAgent =>
    ctx.switchToHttp().getRequest().agent,
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd api && pnpm test agent-auth.guard`
Expected: PASS (4 tests)

- [ ] **Step 7: Install argon2 and commit**

```bash
cd api && pnpm add argon2
git add api/package.json pnpm-lock.yaml api/src/modules/auth
git commit -m "feat(print): authenticate print agents with hashed per-agent keys"
```

---

### Task 7: Agent registration and pairing

**Files:**
- Create: `api/src/modules/printers/print-agents.service.ts`
- Create: `api/src/modules/printers/print-agents.controller.ts`
- Create: `api/src/modules/printers/dto/create-print-agent.dto.ts`
- Create: `api/src/modules/printers/dto/pair-agent.dto.ts`
- Modify: `api/src/common/response-codes.ts`
- Test: `api/src/modules/printers/__tests__/print-agents.service.spec.ts`

**Interfaces:**
- Consumes: `PrintAgent` (Task 5), `AgentRoute` (Task 6)
- Produces:
  - `PrintAgentsService.create(dto): Promise<{ agent: PrintAgent; pairingCode: string }>`
  - `PrintAgentsService.pair(code: string): Promise<{ agentId: string; agentKey: string; warehouseId: number }>`
  - `PrintAgentsService.list(): Promise<Array<PrintAgent & { online: boolean }>>`
  - `PrintAgentsService.revoke(id: string): Promise<void>`
  - `AGENT_ONLINE_WINDOW_MS = 90_000`

- [ ] **Step 1: Add response codes**

In `api/src/common/response-codes.ts`, after the `PJB` block, add:

```ts
// ─────────────────────────────────────────────────────────────
//  PAG  (PrintAgentsController)
// ─────────────────────────────────────────────────────────────
export const PAG = {
  /** GET /print-agents            → data: PrintAgent[]  | metadata: null */
  LIST: { code: 'PAG200_01', status: 200, message: 'Print Agents Retrieved' },
  /** POST /print-agents           → data: { agent, pairingCode } | metadata: null */
  CREATED: { code: 'PAG201_01', status: 201, message: 'Print Agent Created' },
  /** POST /print-agents/pair      → data: { agentId, agentKey, warehouseId } */
  PAIRED: { code: 'PAG200_02', status: 200, message: 'Print Agent Paired' },
  /** DELETE /print-agents/:id     → data: null */
  REVOKED: { code: 'PAG200_03', status: 200, message: 'Print Agent Revoked' },
  /** POST /print-agents/heartbeat → data: null */
  HEARTBEAT: { code: 'PAG200_04', status: 200, message: 'Heartbeat Recorded' },
} as const satisfies Record<string, ResponseDef>;
```

- [ ] **Step 2: Write the failing service tests**

Create `api/src/modules/printers/__tests__/print-agents.service.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { PrintAgentsService, AGENT_ONLINE_WINDOW_MS } from '../print-agents.service';

const tenantConn = (repo: any) => ({
  getRepository: () => repo,
  getCurrentTenantSlug: () => 'acme',
}) as any;

describe('PrintAgentsService', () => {
  it('issues a pairing code prefixed with the tenant slug', async () => {
    const repo = { create: (x: any) => x, save: jest.fn(async (x) => ({ ...x, id: 'a1' })) };
    const svc = new PrintAgentsService(tenantConn(repo));
    const { pairingCode } = await svc.create({ name: 'Caisse', warehouseId: 7 });
    expect(pairingCode).toMatch(/^acme-[A-Z0-9]{8}$/);
  });

  it('rejects an expired pairing code', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'a1', warehouseId: 7, pairingExpiresAt: new Date(Date.now() - 1000),
      }),
      save: jest.fn(),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    await expect(svc.pair('acme-AAAAAAAA')).rejects.toThrow(UnauthorizedException);
  });

  it('consumes the pairing code so it cannot be reused', async () => {
    const agent = { id: 'a1', warehouseId: 7, pairingExpiresAt: new Date(Date.now() + 60_000) };
    const repo = { findOne: jest.fn().mockResolvedValue(agent), save: jest.fn(async (x) => x) };
    const svc = new PrintAgentsService(tenantConn(repo));
    const res = await svc.pair('acme-AAAAAAAA');
    expect(res.agentKey).toHaveLength(64);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pairingCode: null, pairingExpiresAt: null }),
    );
  });

  it('marks an agent online only within the heartbeat window', async () => {
    const fresh = new Date(Date.now() - 1_000);
    const stale = new Date(Date.now() - AGENT_ONLINE_WINDOW_MS - 1_000);
    const repo = { find: jest.fn().mockResolvedValue([
      { id: 'a', lastSeenAt: fresh }, { id: 'b', lastSeenAt: stale }, { id: 'c', lastSeenAt: null },
    ]) };
    const svc = new PrintAgentsService(tenantConn(repo));
    const list = await svc.list();
    expect(list.map((a) => a.online)).toEqual([true, false, false]);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd api && pnpm test print-agents.service`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the service**

Create `api/src/modules/printers/print-agents.service.ts`:

```ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PrintAgent } from './entities/print-agent.entity';
import { CreatePrintAgentDto } from './dto/create-print-agent.dto';

export const AGENT_ONLINE_WINDOW_MS = 90_000; // 3 missed 30s heartbeats
const PAIRING_TTL_MS = 15 * 60_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes

@Injectable()
export class PrintAgentsService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  private get repo() {
    return this.tenantConnService.getRepository(PrintAgent);
  }

  private randomCode(len = 8): string {
    return Array.from(randomBytes(len))
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join('');
  }

  async create(dto: CreatePrintAgentDto) {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    const code = this.randomCode();
    const agent = await this.repo.save(
      this.repo.create({
        name: dto.name,
        warehouseId: dto.warehouseId,
        pairingCode: code,
        pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
        isEnabled: true,
      }),
    );
    // The slug prefix tells the agent which X-Tenant-ID to send.
    return { agent, pairingCode: `${slug}-${code}` };
  }

  async pair(pairingString: string) {
    const code = pairingString.split('-').pop() ?? '';
    const agent = await this.repo.findOne({
      where: { pairingCode: code },
      select: ['id', 'warehouseId', 'pairingExpiresAt'],
    });
    if (!agent || !agent.pairingExpiresAt || agent.pairingExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired pairing code');
    }

    const agentKey = randomBytes(32).toString('hex'); // 64 chars
    await this.repo.save({
      ...agent,
      keyHash: await argon2.hash(agentKey),
      keyPrefix: agentKey.slice(0, 8),
      pairingCode: null,
      pairingExpiresAt: null,
    });

    return { agentId: agent.id, agentKey, warehouseId: agent.warehouseId };
  }

  async list() {
    const agents = await this.repo.find({ order: { name: 'ASC' } });
    const cutoff = Date.now() - AGENT_ONLINE_WINDOW_MS;
    return agents.map((a) => ({
      ...a,
      online: !!a.lastSeenAt && a.lastSeenAt.getTime() > cutoff,
    }));
  }

  async revoke(id: string): Promise<void> {
    const res = await this.repo.update({ id }, { revokedAt: new Date(), isEnabled: false });
    if (!res.affected) throw new NotFoundException('Print agent not found');
  }
}
```

- [ ] **Step 5: Create the DTOs**

`create-print-agent.dto.ts`: `@IsString() @MaxLength(60) name`, `@IsInt() warehouseId`, each with `@ApiProperty`.
`pair-agent.dto.ts`: `@IsString() @MaxLength(40) pairingCode`, with `@ApiProperty`.

- [ ] **Step 6: Create the controller**

Create `api/src/modules/printers/print-agents.controller.ts`. Backoffice routes use `@RequirePermission('printers.edit')`; `pair` is `@AgentRoute()` (no key exists yet, so it authenticates by the pairing code itself) and rate-limited with `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.

```ts
@ApiTags('Print Agents')
@Controller('print-agents')
export class PrintAgentsController {
  constructor(private readonly service: PrintAgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List print agents with online state' })
  @ApiResponse({ status: 200, description: 'Print agents retrieved' })
  @RequirePermission('printers.view')
  async list() {
    return ApiRes(PAG.LIST, await this.service.list());
  }

  @Post()
  @ApiOperation({ summary: 'Create a print agent and issue a pairing code' })
  @ApiResponse({ status: 201, description: 'Print agent created' })
  @RequirePermission('printers.create')
  async create(@Body() dto: CreatePrintAgentDto) {
    return ApiRes(PAG.CREATED, await this.service.create(dto));
  }

  @Post('pair')
  @AgentRoute()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a pairing code for a permanent agent key' })
  @ApiResponse({ status: 200, description: 'Print agent paired' })
  async pair(@Body() dto: PairAgentDto) {
    return ApiRes(PAG.PAIRED, await this.service.pair(dto.pairingCode));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a print agent' })
  @ApiResponse({ status: 200, description: 'Print agent revoked' })
  @RequirePermission('printers.delete')
  async revoke(@Param('id') id: string) {
    await this.service.revoke(id);
    return ApiRes(PAG.REVOKED, null);
  }
}
```

Note: `pair` is marked `@AgentRoute()` only so the global JWT guard lets it through; `AgentAuthGuard` must **not** be applied to it. Bind `AgentAuthGuard` per-controller in Task 8 rather than globally.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd api && pnpm test print-agents.service`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add api/src/modules/printers api/src/common/response-codes.ts
git commit -m "feat(print): register and pair print agents"
```

---

### Task 8: Enqueue a print job

**Files:**
- Create: `api/src/modules/printers/print-jobs.dispatch.service.ts`
- Modify: `api/src/modules/printers/print-jobs.controller.ts`
- Create: `api/src/modules/printers/dto/create-print-job.dto.ts`
- Modify: `api/src/common/response-codes.ts`
- Test: `api/src/modules/printers/__tests__/print-jobs.dispatch.service.spec.ts`

**Interfaces:**
- Consumes: `Printer` (Task 3), `PrintJob` (Task 4)
- Produces:
  - `PrintJobsDispatchService.enqueue(dto, userId): Promise<{ job: PrintJob; created: boolean }>`
  - `buildIdempotencyKey(documentType, documentRef, printerId, reprintSeq?): string`

- [ ] **Step 1: Write the failing tests**

Create `api/src/modules/printers/__tests__/print-jobs.dispatch.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PrintJobsDispatchService, buildIdempotencyKey } from '../print-jobs.dispatch.service';

describe('buildIdempotencyKey', () => {
  it('is stable for the same document and printer', () => {
    expect(buildIdempotencyKey('receipt', 12, 'p1')).toBe(buildIdempotencyKey('receipt', 12, 'p1'));
  });

  it('differs for an explicit reprint', () => {
    expect(buildIdempotencyKey('receipt', 12, 'p1', 2)).not.toBe(buildIdempotencyKey('receipt', 12, 'p1'));
  });
});

describe('PrintJobsDispatchService.enqueue', () => {
  const printer = { id: 'p1', warehouseId: 7, isEnabled: true, documentTypes: ['receipt'] };
  const make = (jobRepo: any, printerRepo: any, notify = jest.fn()) =>
    new PrintJobsDispatchService(
      { getRepository: (e: any) => (e.name === 'PrintJob' ? jobRepo : printerRepo) } as any,
      { notify } as any,
    );

  it('resolves the default printer when none is given', async () => {
    const printerRepo = { findOne: jest.fn().mockResolvedValue(printer) };
    const jobRepo = { findOne: jest.fn().mockResolvedValue(null), create: (x: any) => x, save: jest.fn(async (x) => ({ ...x, id: 'j1' })) };
    const svc = make(jobRepo, printerRepo);
    const { job } = await svc.enqueue({ documentType: 'receipt', documentRef: 12 }, 1);
    expect(printerRepo.findOne).toHaveBeenCalled();
    expect(job.printerId).toBe('p1');
    expect(job.status).toBe('queued');
  });

  it('throws when no printer can handle the document type', async () => {
    const printerRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const svc = make({}, printerRepo);
    await expect(svc.enqueue({ documentType: 'receipt', documentRef: 12 }, 1)).rejects.toThrow(NotFoundException);
  });

  it('returns the existing job for a duplicate submission', async () => {
    const existing = { id: 'j1', status: 'queued' };
    const printerRepo = { findOne: jest.fn().mockResolvedValue(printer) };
    const jobRepo = { findOne: jest.fn().mockResolvedValue(existing), save: jest.fn() };
    const svc = make(jobRepo, printerRepo);
    const res = await svc.enqueue({ documentType: 'receipt', documentRef: 12 }, 1);
    expect(res).toEqual({ job: existing, created: false });
    expect(jobRepo.save).not.toHaveBeenCalled();
  });

  it('notifies the warehouse channel after enqueueing', async () => {
    const notify = jest.fn();
    const printerRepo = { findOne: jest.fn().mockResolvedValue(printer) };
    const jobRepo = { findOne: jest.fn().mockResolvedValue(null), create: (x: any) => x, save: jest.fn(async (x) => ({ ...x, id: 'j1' })) };
    await make(jobRepo, printerRepo, notify).enqueue({ documentType: 'receipt', documentRef: 12 }, 1);
    expect(notify).toHaveBeenCalledWith(7, 'j1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-jobs.dispatch`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the service**

Create `api/src/modules/printers/print-jobs.dispatch.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PrintJob } from './entities/print-job.entity';
import { Printer } from './entities/printer.entity';
import { PrintNotifier } from './print-notifier.service';
import { CreatePrintJobDto } from './dto/create-print-job.dto';

export function buildIdempotencyKey(
  documentType: string,
  documentRef: number,
  printerId: string,
  reprintSeq?: number,
): string {
  const base = `${documentType}:${documentRef}:${printerId}`;
  return reprintSeq ? `${base}:r${reprintSeq}` : base;
}

@Injectable()
export class PrintJobsDispatchService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly notifier: PrintNotifier,
  ) {}

  private get jobs() { return this.tenantConnService.getRepository(PrintJob); }
  private get printers() { return this.tenantConnService.getRepository(Printer); }

  async enqueue(dto: CreatePrintJobDto, userId: number | null) {
    const printer = dto.printerId
      ? await this.printers.findOne({ where: { id: dto.printerId, isEnabled: true } })
      : await this.printers.findOne({
          where: { isEnabled: true, isDefault: true },
          order: { isDefault: 'DESC' },
        });

    if (!printer) {
      throw new NotFoundException(
        `No enabled printer available for document type "${dto.documentType}"`,
      );
    }

    const key = buildIdempotencyKey(dto.documentType, dto.documentRef, printer.id, dto.reprintSeq);

    const existing = await this.jobs.findOne({ where: { idempotencyKey: key } });
    if (existing) return { job: existing, created: false };

    const job = await this.jobs.save(
      this.jobs.create({
        printerId: printer.id,
        warehouseId: printer.warehouseId,
        userId,
        documentType: dto.documentType,
        documentRef: dto.documentRef,
        idempotencyKey: key,
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
        queuedAt: new Date(),
      }),
    );

    this.notifier.notify(printer.warehouseId, job.id);
    return { job, created: true };
  }
}
```

Note: printer resolution must also filter on `documentTypes` containing `dto.documentType` — express this in the `where` with TypeORM's `ArrayContains([dto.documentType])` for both branches.

- [ ] **Step 4: Create the DTO**

`create-print-job.dto.ts`: `@IsIn(['receipt','bl','devis','bon_commande','pos','stock']) documentType`, `@IsInt() documentRef`, `@IsOptional() @IsUUID() printerId`, `@IsOptional() @IsInt() @Min(1) reprintSeq`. Each with `@ApiProperty` / `@ApiPropertyOptional`.

- [ ] **Step 5: Add the endpoint and response codes**

Extend `PJB` in `response-codes.ts`:

```ts
  /** POST /print-jobs (duplicate)     → data: PrintJob | metadata: null */
  DUPLICATE: { code: 'PJB200_02', status: 200, message: 'Print Job Already Queued' },
  /** GET /print-jobs/:id              → data: PrintJob | metadata: null */
  DETAIL: { code: 'PJB200_03', status: 200, message: 'Print Job Retrieved' },
```

Add `@PortalRoute()` to the `PrintJobsController` class — `client/` and `delivery-portal/` both print, so portal tokens must reach it — and add:

```ts
  @Post()
  @ApiOperation({ summary: 'Queue a document for printing' })
  @ApiResponse({ status: 201, description: 'Print job queued' })
  @RequirePermission('printers.print')
  async create(@Body() dto: CreatePrintJobDto, @CurrentUser() user: { id: number } | null) {
    const { job, created } = await this.dispatch.enqueue(dto, user?.id ?? null);
    return ApiRes(created ? PJB.CREATED : PJB.DUPLICATE, job);
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd api && pnpm test print-jobs.dispatch`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/printers api/src/common/response-codes.ts
git commit -m "feat(print): enqueue print jobs with idempotency and printer resolution"
```

---

### Task 9: Claim, payload and result endpoints

The agent-facing core. Claiming must be atomic — two agents must never print one job.

**Files:**
- Create: `api/src/modules/printers/print-jobs.agent.service.ts`
- Create: `api/src/modules/printers/print-jobs.agent.controller.ts`
- Modify: `api/src/common/response-codes.ts`
- Test: `api/src/modules/printers/__tests__/print-jobs.agent.service.spec.ts`

**Interfaces:**
- Consumes: `renderEscPos` (Task 2), `AuthenticatedAgent` (Task 6), `PrintJob` (Task 4)
- Produces:
  - `PrintJobsAgentService.claim(jobId, agent): Promise<PrintJob>` — throws `ConflictException` if already claimed
  - `PrintJobsAgentService.payload(jobId, agent): Promise<EscPosPayload | PdfPayload>` where `EscPosPayload = { kind: 'escpos'; dataBase64: string }` and `PdfPayload = { kind: 'pdf'; url: string; copies: number }`
  - `PrintJobsAgentService.report(jobId, agent, dto): Promise<void>`
  - `PrintJobsAgentService.pending(agent): Promise<PrintJob[]>` — the polling sweep

- [ ] **Step 1: Write the failing tests**

Create `api/src/modules/printers/__tests__/print-jobs.agent.service.spec.ts`:

```ts
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrintJobsAgentService } from '../print-jobs.agent.service';

const agent = { id: 'a1', warehouseId: 7 };

const svcWith = (jobRepo: any, printerRepo: any = {}, renderer: any = {}) =>
  new PrintJobsAgentService(
    { getRepository: (e: any) => (e.name === 'PrintJob' ? jobRepo : printerRepo) } as any,
    renderer,
  );

describe('PrintJobsAgentService.claim', () => {
  it('claims a queued job scoped to the agent warehouse', async () => {
    const query = jest.fn().mockResolvedValue([[{ id: 'j1', status: 'claimed' }], 1]);
    const svc = svcWith({ query });
    const job = await svc.claim('j1', agent);
    expect(job.status).toBe('claimed');
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("status='queued'");
    expect(params).toEqual(['a1', 'j1', 7]);
  });

  it('throws Conflict when another agent already claimed it', async () => {
    const svc = svcWith({ query: jest.fn().mockResolvedValue([[], 0]) });
    await expect(svc.claim('j1', agent)).rejects.toThrow(ConflictException);
  });
});

describe('PrintJobsAgentService.payload', () => {
  it('refuses a job the agent does not hold', async () => {
    const jobRepo = { findOne: jest.fn().mockResolvedValue({ id: 'j1', agentId: 'other', warehouseId: 7 }) };
    await expect(svcWith(jobRepo).payload('j1', agent)).rejects.toThrow(ForbiddenException);
  });
});

describe('PrintJobsAgentService.report', () => {
  it('marks a successful job done', async () => {
    const jobRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'j1', agentId: 'a1', warehouseId: 7, attempts: 0 }),
      save: jest.fn(async (x) => x),
    };
    await svcWith(jobRepo).report('j1', agent, { status: 'done', durationMs: 120 });
    expect(jobRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'done', durationMs: 120 }));
  });

  it('records the error message on failure', async () => {
    const jobRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'j1', agentId: 'a1', warehouseId: 7, attempts: 0 }),
      save: jest.fn(async (x) => x),
    };
    await svcWith(jobRepo).report('j1', agent, { status: 'failed', durationMs: 5, error: 'out of paper' });
    expect(jobRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', lastError: 'out of paper' }),
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-jobs.agent.service`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the service**

Create `api/src/modules/printers/print-jobs.agent.service.ts`. The claim is a single conditional UPDATE — this is what makes it race-proof:

```ts
  async claim(jobId: string, agent: AuthenticatedAgent): Promise<PrintJob> {
    const [rows, count] = await this.jobs.query(
      `UPDATE print_jobs
          SET status = 'claimed', agent_id = $1, claimed_at = now(), attempts = attempts + 1
        WHERE id = $2 AND warehouse_id = $3 AND status = 'queued'
        RETURNING *`,
      [agent.id, jobId, agent.warehouseId],
    );
    if (!count) throw new ConflictException('Job already claimed or not queued');
    return rows[0];
  }
```

`payload()` loads the job, asserts `job.agentId === agent.id` (else `ForbiddenException`), loads the printer, and branches on `printer.kind`: `thermal` builds `ReceiptData` from the document and returns `{ kind: 'escpos', dataBase64: renderEscPos(data, { paperWidth: printer.paperWidth, brand: printer.brand }).toString('base64') }`; `document` returns `{ kind: 'pdf', url: <presigned MinIO URL from PDFService>, copies: 1 }`. It also transitions the job to `printing` — after this point the bytes are considered sent.

`report()` asserts ownership, then sets `status`, `durationMs`, `completedAt`, and `lastError` on failure.

`pending()` returns `this.jobs.find({ where: { warehouseId: agent.warehouseId, status: 'queued' }, order: { queuedAt: 'ASC' }, take: 20 })`.

- [ ] **Step 4: Add the controller and response codes**

Create `api/src/modules/printers/print-jobs.agent.controller.ts` with `@Controller('print-jobs')`, `@AgentRoute()` and `@UseGuards(AgentAuthGuard)` on the class, exposing `POST :id/claim`, `GET :id/payload`, `POST :id/result`, and `GET pending`. Add `PJB.CLAIMED`, `PJB.PAYLOAD`, `PJB.REPORTED`, `PJB.PENDING` response codes.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && pnpm test print-jobs.agent.service`
Expected: PASS (5 tests)

- [ ] **Step 6: Add a real concurrency test**

Create `api/src/modules/printers/__tests__/claim-concurrency.spec.ts`, which requires a live test database. It inserts one queued job, fires 10 concurrent `claim()` calls with `Promise.allSettled`, and asserts exactly one fulfils and nine reject with `ConflictException`. Skip with `describe.skip` if `process.env.TEST_DATABASE_URL` is unset, so CI without a database still passes.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/printers api/src/common/response-codes.ts
git commit -m "feat(print): agent claim, payload and result endpoints"
```

---

### Task 10: SSE stream with Redis fan-out

**Files:**
- Create: `api/src/modules/printers/print-notifier.service.ts`
- Modify: `api/src/modules/printers/print-jobs.agent.controller.ts`
- Test: `api/src/modules/printers/__tests__/print-notifier.service.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `PrintNotifier.notify(warehouseId: number, jobId: string): void`
  - `PrintNotifier.stream(warehouseId: number): Observable<{ jobId: string }>`
  - channel naming: `print:<tenantSlug>:<warehouseId>`

- [ ] **Step 1: Write the failing test**

```ts
import { firstValueFrom } from 'rxjs';
import { PrintNotifier } from '../print-notifier.service';

describe('PrintNotifier', () => {
  it('delivers a notification to a subscriber of the same warehouse', async () => {
    const pub = { publish: jest.fn() };
    const sub = { subscribe: jest.fn(), on: jest.fn() };
    const notifier = new PrintNotifier(pub as any, sub as any, { getCurrentTenantSlug: () => 'acme' } as any);
    const received = firstValueFrom(notifier.stream(7));
    notifier.handleMessage('print:acme:7', JSON.stringify({ jobId: 'j1' }));
    await expect(received).resolves.toEqual({ jobId: 'j1' });
  });

  it('does not deliver notifications for another warehouse', async () => {
    const notifier = new PrintNotifier({ publish: jest.fn() } as any, { subscribe: jest.fn(), on: jest.fn() } as any, { getCurrentTenantSlug: () => 'acme' } as any);
    const seen: unknown[] = [];
    notifier.stream(7).subscribe((v) => seen.push(v));
    notifier.handleMessage('print:acme:9', JSON.stringify({ jobId: 'j2' }));
    expect(seen).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-notifier`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the notifier**

Create `api/src/modules/printers/print-notifier.service.ts` using two `ioredis` clients (a publisher and a dedicated subscriber, since a subscribed client cannot issue other commands). Internally hold a `Subject<{ channel: string; jobId: string }>`; `stream(warehouseId)` filters that subject by the channel for the current tenant and warehouse. `handleMessage` is exposed so it can be unit-tested without Redis.

Reuse the existing Redis connection settings that BullMQ is configured with rather than introducing new env vars.

- [ ] **Step 4: Expose the SSE endpoint**

In `print-jobs.agent.controller.ts` add:

```ts
  @Sse('stream')
  @ApiOperation({ summary: 'Server-sent stream of print jobs for this agent warehouse' })
  stream(@CurrentAgent() agent: AuthenticatedAgent): Observable<MessageEvent> {
    return this.notifier.stream(agent.warehouseId).pipe(
      map((e) => ({ data: e }) as MessageEvent),
    );
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && pnpm test print-notifier`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/printers
git commit -m "feat(print): notify agents over SSE with Redis fan-out"
```

---

### Task 11: The reaper — stuck and stale jobs

This is the task that prevents duplicate receipts. A job that died while `claimed` never reached the device and is safe to requeue; a job that died while `printing` may have physically printed and must never be retried automatically.

**Files:**
- Create: `api/src/modules/printers/print-jobs.reaper.service.ts`
- Test: `api/src/modules/printers/__tests__/print-jobs.reaper.service.spec.ts`

**Interfaces:**
- Consumes: `PrintJob` (Task 4)
- Produces:
  - `PrintJobsReaper.sweep(tenantSlug): Promise<{ requeued: number; failed: number; expired: number }>`
  - `CLAIM_TIMEOUT_MS = 60_000`, `STALE_QUEUE_MS = 15 * 60_000`

- [ ] **Step 1: Write the failing tests**

```ts
import { PrintJobsReaper, CLAIM_TIMEOUT_MS, STALE_QUEUE_MS } from '../print-jobs.reaper.service';

describe('PrintJobsReaper.sweep', () => {
  const build = (query: jest.Mock) =>
    new PrintJobsReaper({ getRepository: () => ({ query }) } as any);

  it('requeues jobs stuck in claimed', async () => {
    const query = jest.fn().mockResolvedValue([[], 2]);
    await build(query).sweep('acme');
    const requeue = query.mock.calls.find(([sql]) => sql.includes("status = 'queued'"));
    expect(requeue[0]).toContain("WHERE status = 'claimed'");
  });

  it('never requeues jobs stuck in printing — it fails them', async () => {
    const query = jest.fn().mockResolvedValue([[], 1]);
    await build(query).sweep('acme');
    const printingSql = query.mock.calls.map(([sql]) => sql).join('\n');
    expect(printingSql).toContain("status = 'failed'");
    expect(printingSql).not.toMatch(/SET status = 'queued'[\s\S]*status = 'printing'/);
  });

  it('cancels jobs queued longer than the staleness window', async () => {
    const query = jest.fn().mockResolvedValue([[], 3]);
    await build(query).sweep('acme');
    const cancel = query.mock.calls.find(([sql]) => sql.includes("status = 'cancelled'"));
    expect(cancel).toBeDefined();
  });

  it('uses a claim timeout well below the staleness window', () => {
    expect(CLAIM_TIMEOUT_MS).toBeLessThan(STALE_QUEUE_MS);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-jobs.reaper`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the reaper**

Create `api/src/modules/printers/print-jobs.reaper.service.ts` with three statements:

```ts
// 1. claimed but never started -> safe to requeue (bytes never sent)
`UPDATE print_jobs SET status = 'queued', agent_id = NULL, claimed_at = NULL
  WHERE status = 'claimed' AND claimed_at < now() - interval '60 seconds'
    AND attempts < max_attempts`

// 2. claimed, out of attempts -> give up
`UPDATE print_jobs SET status = 'failed', last_error = 'agent did not respond',
        completed_at = now()
  WHERE status = 'claimed' AND claimed_at < now() - interval '60 seconds'
    AND attempts >= max_attempts`

// 3. printing -> NEVER auto-retry; may have physically printed
`UPDATE print_jobs SET status = 'failed', completed_at = now(),
        last_error = 'agent lost while printing; may have printed — retry manually'
  WHERE status = 'printing' AND claimed_at < now() - interval '60 seconds'`

// 4. queued too long -> cancel, so a reconnecting agent does not print stale receipts
`UPDATE print_jobs SET status = 'cancelled', completed_at = now(),
        last_error = 'expired before an agent came online'
  WHERE status = 'queued' AND queued_at < now() - interval '15 minutes'`
```

Schedule it with `@Cron(CronExpression.EVERY_30_SECONDS)`, iterating active tenants and wrapping each in `tenantStorage.run(...)` exactly as `pdf.queue.processor.ts` does.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && pnpm test print-jobs.reaper`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/printers/print-jobs.reaper.service.ts api/src/modules/printers/__tests__/print-jobs.reaper.service.spec.ts
git commit -m "feat(print): reap stuck and stale print jobs without duplicate prints"
```

---

### Task 12: Heartbeat and operator endpoints

**Files:**
- Modify: `api/src/modules/printers/print-agents.service.ts`, `print-agents.controller.ts`
- Modify: `api/src/modules/printers/print-jobs.controller.ts`
- Modify: `api/src/common/response-codes.ts`
- Test: `api/src/modules/printers/__tests__/print-agents.heartbeat.spec.ts`

**Interfaces:**
- Consumes: `AuthenticatedAgent` (Task 6), `PrintJob` (Task 4)
- Produces:
  - `PrintAgentsService.heartbeat(agent, dto): Promise<void>` where `dto = { version: string; platform: string; printers: Array<{ id: string; reachable: boolean }> }`
  - `PrintJobsService.retry(id)`, `PrintJobsService.cancel(id)`, `PrintJobsService.findOne(id)`

- [ ] **Step 1: Write the failing heartbeat test**

```ts
import { PrintAgentsService } from '../print-agents.service';

describe('PrintAgentsService.heartbeat', () => {
  it('records agent liveness and per-printer reachability', async () => {
    const agentRepo = { update: jest.fn() };
    const printerRepo = { update: jest.fn() };
    const svc = new PrintAgentsService({
      getRepository: (e: any) => (e.name === 'PrintAgent' ? agentRepo : printerRepo),
      getCurrentTenantSlug: () => 'acme',
    } as any);

    await svc.heartbeat({ id: 'a1', warehouseId: 7 }, {
      version: '1.0.0', platform: 'win32',
      printers: [{ id: 'p1', reachable: true }, { id: 'p2', reachable: false }],
    });

    expect(agentRepo.update).toHaveBeenCalledWith(
      { id: 'a1' },
      expect.objectContaining({ version: '1.0.0', platform: 'win32' }),
    );
    expect(printerRepo.update).toHaveBeenCalledWith({ id: 'p1', warehouseId: 7 }, expect.objectContaining({ lastSeenAt: expect.any(Date) }));
    expect(printerRepo.update).not.toHaveBeenCalledWith({ id: 'p2', warehouseId: 7 }, expect.anything());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && pnpm test print-agents.heartbeat`
Expected: FAIL — `svc.heartbeat is not a function`

- [ ] **Step 3: Implement heartbeat**

Add to `PrintAgentsService`: update the agent's `lastSeenAt`, `version` and `platform`; for each reported printer with `reachable: true`, set that printer's `lastSeenAt`, scoped by `warehouseId` so an agent cannot touch another shop's printers.

- [ ] **Step 4: Add operator endpoints**

On `PrintJobsController` (already `@PortalRoute()` from Task 8) add `GET :id` (`PJB.DETAIL`, `printers.view`), `POST :id/retry` and `POST :id/cancel` (`printers.print`). `retry` re-queues only jobs in `failed` or `cancelled`, resetting `attempts` to 0 and issuing a fresh `idempotencyKey` with an incremented reprint sequence. Extend the existing `GET /print-jobs` query DTO with `status` and `warehouseId` filters.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && pnpm test print-agents`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/printers api/src/common/response-codes.ts
git commit -m "feat(print): agent heartbeat and operator job controls"
```

---

### Task 13: Module wiring and documentation

**Files:**
- Modify: `api/src/modules/printers/printers.module.ts`
- Modify: `api/src/app.module.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: every service from Tasks 2–12
- Produces: a bootable API with all print endpoints registered

- [ ] **Step 1: Wire the module**

In `printers.module.ts`, register the new controllers (`PrintAgentsController`, `PrintJobsAgentController`) and providers (`PrintAgentsService`, `PrintJobsDispatchService`, `PrintJobsAgentService`, `PrintJobsReaper`, `PrintNotifier`), import `ScheduleModule.forRoot()` if not already imported at app level, and export `PrintJobsDispatchService` so other modules can queue prints.

- [ ] **Step 2: Verify the app boots and routes are mapped**

Run: `cd api && pnpm start:dev`
Expected: startup log lists `POST /print-jobs`, `GET /print-jobs/stream`, `POST /print-jobs/:id/claim`, `GET /print-jobs/:id/payload`, `POST /print-jobs/:id/result`, `POST /print-agents/pair`, `POST /print-agents/heartbeat`. No dependency-injection errors.

- [ ] **Step 3: Verify the full test suite passes**

Run: `cd api && pnpm test`
Expected: PASS, no regressions in existing suites.

- [ ] **Step 4: Update CLAUDE.md**

In the Auth section, add `print-jobs` to the list of controllers carrying `@PortalRoute()` (the client and delivery portals both print). Record that `printers` and `print-agents` stay backoffice-only, and note the new `@AgentRoute()` decorator alongside `@Public()` and `@PortalRoute()`. Add `printers` to the API modules list if absent.

- [ ] **Step 5: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes; new nodes for the printers module appear.

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/printers/printers.module.ts api/src/app.module.ts CLAUDE.md
git commit -m "feat(print): wire print agent module and document route scopes"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: schema changes → Tasks 3–5; authentication → Tasks 6–7; caller endpoints → Tasks 8, 12; agent endpoints → Tasks 9–10, 12; ESC/POS rendering → Task 2; failure handling → Task 11; Phase 0 → Task 1; module wiring and the `CLAUDE.md` correction → Task 13. Not covered here by design: the agent package (Plan 2), the frontend switch and `printing.mode` flag (Plan 3), and network discovery (Plan 2, last item).

**Type consistency.** `documentRef` (integer) is used consistently from the DTO through the entity and reaper; the spec's older `documentId` name is superseded because the column is new. `AuthenticatedAgent { id, warehouseId }` is produced in Task 6 and consumed unchanged in Tasks 9, 10 and 12. `renderEscPos(data, opts)` is defined in Task 2 and called in Task 9 with `{ paperWidth, brand }` matching `RenderOptions`. `PrintNotifier.notify(warehouseId, jobId)` is asserted in Task 8's test and implemented in Task 10 — Task 8 must therefore stub it, which its tests do.

**Ordering note.** Task 8 depends on `PrintNotifier` from Task 10. Its tests inject a stub, so Task 8 is implementable first; if executing strictly in order, create `print-notifier.service.ts` as a no-op stub in Task 8 and complete it in Task 10.
