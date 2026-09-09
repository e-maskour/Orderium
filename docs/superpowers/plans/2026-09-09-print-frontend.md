# Print Frontend Implementation Plan (Phase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the backoffice into the print queue — manage agents, configure printers against warehouses, and queue receipts from the order and POS flows with the true status visible at all times.

**Architecture:** The browser stops printing. A button POSTs a job and polls its status; an agent in the shop does the work. Where no agent is online the UI says so and offers an explicit browser fallback, so a failure is never silent.

**Tech Stack:** React 18, Vite, TanStack Query, lucide-react, existing `apiClient`.

**Spec:** `docs/superpowers/specs/2026-09-09-print-agent-design.md`

**Depends on:** Plans 1 and 2 (both complete, branch `feat/print-agent-api`)

## Findings that shape this plan

- **`PrintButton` is rendered nowhere.** It exists in `backoffice/`, `client/` and `delivery-portal/` and no page imports it. There is no live print flow to migrate — this plan wires printing in for the first time.
- **The `printing.mode` flag from the spec is dropped.** It existed to make a behaviour change reversible; with no live flow to revert to, and a UI that always shows real status plus a manual fallback, it is dead weight. YAGNI.
- **`IPrinter` in the backoffice is stale** — it still carries `brand: 'qztray' | 'browser'` and `connectionType: 'wifi' | 'browser'`, which the API removed in Plan 1, and lacks `warehouseId`, `kind` and `systemName`.
- **POS integration belongs in `OrderSuccessPage`**, not `POS.tsx`. POS navigates to `/checkout/success` after creating the order; that page already resolves an order id and renders a Printer icon.
- Client and delivery portals are **out of scope** — their `PrintButton`s stay unused and untouched.

## Global Constraints

- Package manager is **pnpm**.
- Frontend module layout: `src/modules/<name>/` with `.interface.ts`, `.model.ts`, `.service.ts`, `index.ts` barrel; routes in `src/common/api/`.
- Server state goes through TanStack Query, matching `Printers.tsx`.
- Never print from the browser except through the explicit fallback the operator chooses.
- Existing UI in `Printers.tsx` (list, form, document types, history tab) is retained, not rewritten.
- Verify with `pnpm build` from `backoffice/` — it runs `tsc --noEmit` before Vite.

---

### Task 1: Align the printers module with the API

**Files:**
- Modify: `backoffice/src/modules/printers/printers.interface.ts`
- Modify: `backoffice/src/modules/printers/printers.service.ts`
- Modify: `backoffice/src/modules/printers/index.ts`
- Modify: `backoffice/src/common/api/api-routes.ts`

**Interfaces:**
- Consumes: the Plan 1/2 API
- Produces:
  - `IPrinter` gains `warehouseId: number | null`, `kind: 'thermal' | 'document'`, `systemName: string | null`; `brand` narrowed to `'epson'|'star'|'generic'`; `connectionType` to `'network'|'usb'|'system'`
  - `interface IPrintAgent { id, name, warehouseId, keyPrefix, lastSeenAt, version, platform, isEnabled, revokedAt, online }`
  - `IPrintJob.status: 'queued'|'claimed'|'printing'|'done'|'failed'|'cancelled'`, plus `warehouseId`, `agentId`, `documentRef`, `attempts`, `queuedAt`, `completedAt`
  - `printersService.queueJob(dto): Promise<IPrintJob>`
  - `printersService.getJob(id): Promise<IPrintJob>`
  - `printersService.retryJob(id) / cancelJob(id): Promise<IPrintJob>`
  - `printersService.getAgents(): Promise<IPrintAgent[]>`
  - `printersService.createAgent(dto): Promise<{ agent: IPrintAgent; pairingCode: string }>`
  - `printersService.revokeAgent(id): Promise<void>`

- [ ] **Step 1: Update the interfaces**

In `printers.interface.ts` replace the `IPrinter` union fields and add the new ones:

```ts
export interface IPrinter {
  id: string;
  name: string;
  brand: 'epson' | 'star' | 'generic';
  connectionType: 'network' | 'usb' | 'system';
  kind: 'thermal' | 'document';
  warehouseId: number | null;
  systemName: string | null;
  model: string | null;
  ip: string | null;
  port: number;
  paperWidth: 80 | 148;
  isDefault: boolean;
  documentTypes: string[];
  lastSeenAt: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrinterDTO {
  name: string;
  brand: IPrinter['brand'];
  connectionType: IPrinter['connectionType'];
  kind: IPrinter['kind'];
  warehouseId: number;
  systemName?: string;
  model?: string;
  ip?: string;
  port?: number;
  paperWidth: IPrinter['paperWidth'];
  isDefault?: boolean;
  documentTypes: string[];
}

export type PrintJobStatus =
  | 'queued' | 'claimed' | 'printing' | 'done' | 'failed' | 'cancelled';

/** Terminal states: polling stops here. */
export const TERMINAL_STATUSES: PrintJobStatus[] = ['done', 'failed', 'cancelled'];

export interface IPrintAgent {
  id: string;
  name: string;
  warehouseId: number;
  keyPrefix: string | null;
  lastSeenAt: string | null;
  version: string | null;
  platform: string | null;
  isEnabled: boolean;
  revokedAt: string | null;
  online: boolean;
}

export interface CreatePrintAgentDTO {
  name: string;
  warehouseId: number;
}

export interface QueuePrintJobDTO {
  documentType: string;
  documentRef: number;
  printerId?: string;
  warehouseId?: number;
  reprintSeq?: number;
}
```

Extend `IPrintJob` with `status: PrintJobStatus`, `warehouseId: number | null`, `agentId: string | null`, `documentRef: number | null`, `attempts: number`, `queuedAt: string`, `completedAt: string | null`. Keep `method` and `printedAt` — the history tab still reads them for pre-agent rows.

- [ ] **Step 2: Update `printers.model.ts`**

`Printer` implements `IPrinter`, so add `kind`, `warehouseId` and `systemName` as fields and assign them in the constructor alongside the existing ones.

- [ ] **Step 3: Add the routes**

In `backoffice/src/common/api/api-routes.ts`, beside the existing `PRINTERS` and `PRINT_JOBS` blocks:

```ts
  PRINT_JOBS: {
    LIST: '/api/print-jobs',
    CREATE: '/api/print-jobs',
    /** Legacy browser-side print log; removed when agents ship. */
    LOG: '/api/print-jobs/log',
    DETAIL: (id: string) => `/api/print-jobs/${id}`,
    RETRY: (id: string) => `/api/print-jobs/${id}/retry`,
    CANCEL: (id: string) => `/api/print-jobs/${id}/cancel`,
  },
  PRINT_AGENTS: {
    LIST: '/api/print-agents',
    CREATE: '/api/print-agents',
    REVOKE: (id: string) => `/api/print-agents/${id}`,
  },
```

- [ ] **Step 4: Add the service methods**

Append to `PrintersService`:

```ts
  async queueJob(dto: QueuePrintJobDTO): Promise<IPrintJob> {
    const res = await apiClient.post<IPrintJob>(API_ROUTES.PRINT_JOBS.CREATE, dto);
    return res.data;
  }

  async getJob(id: string): Promise<IPrintJob> {
    const res = await apiClient.get<IPrintJob>(API_ROUTES.PRINT_JOBS.DETAIL(id));
    return res.data;
  }

  async retryJob(id: string): Promise<IPrintJob> {
    const res = await apiClient.post<IPrintJob>(API_ROUTES.PRINT_JOBS.RETRY(id), {});
    return res.data;
  }

  async cancelJob(id: string): Promise<IPrintJob> {
    const res = await apiClient.post<IPrintJob>(API_ROUTES.PRINT_JOBS.CANCEL(id), {});
    return res.data;
  }

  async getAgents(): Promise<IPrintAgent[]> {
    const res = await apiClient.get<IPrintAgent[]>(API_ROUTES.PRINT_AGENTS.LIST);
    return res.data;
  }

  async createAgent(
    dto: CreatePrintAgentDTO,
  ): Promise<{ agent: IPrintAgent; pairingCode: string }> {
    const res = await apiClient.post<{ agent: IPrintAgent; pairingCode: string }>(
      API_ROUTES.PRINT_AGENTS.CREATE,
      dto,
    );
    return res.data;
  }

  async revokeAgent(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.PRINT_AGENTS.REVOKE(id));
  }
```

Export the new types from `index.ts`.

- [ ] **Step 5: Verify it compiles**

Run: `cd backoffice && npx tsc --noEmit`
Expected: errors ONLY in `Printers.tsx` (it still passes the removed `brand`/`connectionType` values and omits the new required fields). Those are fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add backoffice/src/modules/printers backoffice/src/common/api/api-routes.ts
git commit -m "feat(print): align backoffice printer types with the queue API"
```

---

### Task 2: The usePrint hook

**Files:**
- Create: `backoffice/src/hooks/usePrint.ts`
- Delete: `backoffice/src/hooks/usePrinter.ts`

**Interfaces:**
- Consumes: `printersService`, `IPrintJob`, `PrintJobStatus`
- Produces:
  - `usePrint()` returning `{ print, state, job, error, reset, printHere }`
  - `type PrintState = 'idle' | 'queuing' | 'waiting' | 'printed' | 'offline' | 'failed'`
  - `POLL_INTERVAL_MS = 1000`, `POLL_TIMEOUT_MS = 12_000`

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useRef, useState } from 'react';
import { printersService } from '../modules/printers';
import type { IPrintJob, QueuePrintJobDTO } from '../modules/printers';

export const POLL_INTERVAL_MS = 1000;
/** After this, the job is queued but no agent has taken it — say so. */
export const POLL_TIMEOUT_MS = 12_000;

export type PrintState =
  | 'idle'
  | 'queuing'
  | 'waiting'
  | 'printed'
  | 'offline'
  | 'failed';

export function usePrint() {
  const [state, setState] = useState<PrintState>('idle');
  const [job, setJob] = useState<IPrintJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState('idle');
    setJob(null);
    setError(null);
  }, []);

  const print = useCallback(async (dto: QueuePrintJobDTO) => {
    cancelled.current = false;
    setError(null);
    setState('queuing');

    let queued: IPrintJob;
    try {
      queued = await printersService.queueJob(dto);
      setJob(queued);
    } catch (e) {
      setError((e as Error).message);
      setState('failed');
      return;
    }

    setState('waiting');
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline && !cancelled.current) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (cancelled.current) return;

      let current: IPrintJob;
      try {
        current = await printersService.getJob(queued.id);
      } catch {
        continue; // a transient error must not abandon a job that may print
      }
      setJob(current);

      if (current.status === 'done') return setState('printed');
      if (current.status === 'failed' || current.status === 'cancelled') {
        setError(current.errorMessage ?? 'Print failed');
        return setState('failed');
      }
    }

    // Still queued or claimed: no agent finished it in time.
    if (!cancelled.current) setState('offline');
  }, []);

  /** The explicit fallback. Only ever runs because the operator asked. */
  const printHere = useCallback(() => window.print(), []);

  return { print, printHere, state, job, error, reset };
}
```

- [ ] **Step 2: Delete the old hook**

`usePrinter.ts` drove browser printing directly. Delete it; `PrintButton` is rewritten in Task 3 to use `usePrint`.

```bash
rm backoffice/src/hooks/usePrinter.ts
```

- [ ] **Step 3: Verify**

Run: `cd backoffice && npx tsc --noEmit`
Expected: errors only in `PrintButton.tsx` (Task 3) and `Printers.tsx` (Task 4).

- [ ] **Step 4: Commit**

```bash
git add backoffice/src/hooks
git commit -m "feat(print): usePrint hook that queues a job and polls its status"
```

---

### Task 3: PrintButton with honest states

**Files:**
- Modify: `backoffice/src/components/PrintButton.tsx`

**Interfaces:**
- Consumes: `usePrint`, `PrintableReceipt`
- Produces: `<PrintButton documentType documentRef printerId? warehouseId? label? variant? />`

- [ ] **Step 1: Rewrite the component**

```tsx
import { Printer, Loader2, Check, AlertTriangle } from 'lucide-react';
import { usePrint } from '../hooks/usePrint';

interface Props {
  documentType: 'receipt' | 'bl' | 'devis' | 'bon_commande' | 'pos' | 'stock';
  documentRef: number;
  printerId?: string;
  warehouseId?: number;
  label?: string;
  variant?: 'button' | 'icon';
}

const BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '0.875rem',
  fontWeight: 500,
  backgroundColor: '#fff',
  color: '#374151',
};

export function PrintButton({
  documentType,
  documentRef,
  printerId,
  warehouseId,
  label = 'Imprimer',
  variant = 'button',
}: Props) {
  const { print, printHere, state, error, reset } = usePrint();
  const busy = state === 'queuing' || state === 'waiting';

  const icon = {
    idle: <Printer style={{ width: 16, height: 16 }} />,
    queuing: <Loader2 style={{ width: 16, height: 16 }} className="spin" />,
    waiting: <Loader2 style={{ width: 16, height: 16 }} className="spin" />,
    printed: <Check style={{ width: 16, height: 16, color: '#059669' }} />,
    offline: <AlertTriangle style={{ width: 16, height: 16, color: '#d97706' }} />,
    failed: <AlertTriangle style={{ width: 16, height: 16, color: '#dc2626' }} />,
  }[state];

  const text = {
    idle: label,
    queuing: 'Envoi…',
    waiting: 'Impression…',
    printed: 'Imprimé',
    offline: 'En attente',
    failed: 'Échec',
  }[state];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={() => print({ documentType, documentRef, printerId, warehouseId })}
        disabled={busy}
        title={error ?? label}
        style={{ ...BASE, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {icon}
        {variant === 'button' && text}
      </button>

      {/* No silent fallback: the operator is told what happened and chooses. */}
      {(state === 'offline' || state === 'failed') && (
        <button
          onClick={() => {
            printHere();
            reset();
          }}
          style={{ ...BASE, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}
          title={
            state === 'offline'
              ? "Aucun agent n'a pris le travail. Il s'imprimera dès qu'un agent sera en ligne."
              : (error ?? 'Échec de l’impression')
          }
        >
          Imprimer ici
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Verify the spin animation exists**

Run: `grep -rn "@keyframes spin" backoffice/src/*.css backoffice/src/**/*.css`
If absent, add to `backoffice/src/theme.css`:

```css
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
```

- [ ] **Step 3: Verify**

Run: `cd backoffice && npx tsc --noEmit`
Expected: errors only in `Printers.tsx`.

- [ ] **Step 4: Commit**

```bash
git add backoffice/src/components/PrintButton.tsx backoffice/src/theme.css
git commit -m "feat(print): print button with visible state and explicit fallback"
```

---

### Task 4: Printer form gains warehouse, kind and system name

**Files:**
- Modify: `backoffice/src/pages/configurations/Printers.tsx`

**Interfaces:**
- Consumes: `warehouseService` (existing), `CreatePrinterDTO`
- Produces: a form that submits the fields the API now requires

- [ ] **Step 1: Load warehouses**

At the top of the `Printers` component:

```tsx
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.getWarehouses(),
  });
```

Import from the existing warehouses module. If its method has another name, use whatever `backoffice/src/modules/warehouses` exports — check with
`grep -n "async get" backoffice/src/modules/warehouses/*.service.ts`.

- [ ] **Step 2: Update the option constants**

```tsx
const BRAND_OPTIONS = [
  { value: 'epson', label: 'Epson' },
  { value: 'star', label: 'Star Micronics' },
  { value: 'generic', label: 'Générique' },
] as const;

const CONNECTION_OPTIONS = [
  { value: 'network', labelKey: 'printerConnNetwork' },
  { value: 'usb', labelKey: 'printerConnUsb' },
  { value: 'system', labelKey: 'printerConnSystem' },
] as const;

const KIND_OPTIONS = [
  { value: 'thermal', labelKey: 'printerKindThermal' },
  { value: 'document', labelKey: 'printerKindDocument' },
] as const;
```

Add `printerConnNetwork`, `printerConnUsb`, `printerConnSystem`, `printerKindThermal`, `printerKindDocument`, `printerWarehouse`, `printerSystemName`, plus the Task 5 agent keys, to `backoffice/src/lib/langs/fr_FR/configurations.ts` and `ar_MA/configurations.ts`.

- [ ] **Step 3: Extend the form state and fields**

`PrinterForm`'s `useState<CreatePrinterDTO>` gains:

```tsx
    kind: (printer?.kind ?? 'thermal') as CreatePrinterDTO['kind'],
    warehouseId: printer?.warehouseId ?? warehouses[0]?.id ?? 0,
    systemName: printer?.systemName ?? undefined,
```

Add a required warehouse `<select>`, a `kind` select, and a `systemName` text input shown when `connectionType` is `usb` or `system`. The IP field's condition changes from `['wifi','network']` to `form.connectionType === 'network'`.

- [ ] **Step 4: Verify the whole app compiles**

Run: `cd backoffice && pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add backoffice/src/pages/configurations/Printers.tsx backoffice/src/lib/langs
git commit -m "feat(print): configure printers against a warehouse, kind and queue name"
```

---

### Task 5: Agents tab

**Files:**
- Modify: `backoffice/src/pages/configurations/Printers.tsx`

**Interfaces:**
- Consumes: `printersService.getAgents/createAgent/revokeAgent`, `IPrintAgent`
- Produces: an `agents` tab beside `printers` and `history`

- [ ] **Step 1: Add the tab**

Widen the tab state to `'printers' | 'agents' | 'history'` and add `agents` to the tab list.

- [ ] **Step 2: Query agents with a live refresh**

```tsx
  const { data: agents = [] } = useQuery({
    queryKey: ['print-agents'],
    queryFn: () => printersService.getAgents(),
    enabled: activeTab === 'agents',
    // Online state is derived from a 30s heartbeat; refresh so a shop coming
    // back online is visible without a manual reload.
    refetchInterval: activeTab === 'agents' ? 15_000 : false,
  });
```

- [ ] **Step 3: Render the list**

Each row shows a status dot (`#059669` when `agent.online`, `#9ca3af` otherwise), the name, the warehouse name resolved from `warehouses`, `platform`/`version` when present, last-seen as a relative time, and a Revoke button. Revoking calls `revokeAgent` inside a `useMutation` that invalidates `['print-agents']`, guarded by the existing confirm dialog used by `handleDelete`.

- [ ] **Step 4: Add-agent flow with the pairing code**

A modal takes a name and warehouse, calls `createAgent`, and then displays the returned `pairingCode` prominently with a copy button and this warning:

> Ce code est valable 15 minutes et ne peut être utilisé qu'une seule fois. Il ne sera plus affiché.

The code must be shown until the operator dismisses the modal — it cannot be retrieved later.

- [ ] **Step 5: Verify**

Run: `cd backoffice && pnpm build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add backoffice/src/pages/configurations/Printers.tsx backoffice/src/lib/langs
git commit -m "feat(print): manage print agents and pairing from settings"
```

---

### Task 6: Test print through the real queue

**Files:**
- Modify: `backoffice/src/pages/configurations/Printers.tsx`

**Interfaces:**
- Consumes: `usePrint`
- Produces: a per-printer test that exercises the same path a real print takes

- [ ] **Step 1: Replace `handleTestPrint`**

The current handler calls `printReceipt` in the browser, which no longer proves anything. Replace it so it queues a real job against that printer:

```tsx
  const testPrint = usePrint();

  const handleTestPrint = (printer: IPrinter) => {
    if (!printer.warehouseId) {
      toastError(t('printerNoWarehouse'));
      return;
    }
    // documentRef 0 is the agreed "test page" marker; the API renders a
    // fixed sample receipt rather than looking up a document.
    void testPrint.print({
      documentType: 'receipt',
      documentRef: 0,
      printerId: printer.id,
    });
  };
```

Surface `testPrint.state` next to the row: spinner while waiting, ✓ on `printed`, and on `offline` the message "Aucun agent en ligne pour ce magasin".

- [ ] **Step 2: Support the test page in the API**

`documentRef: 0` must not hit the order lookup. In `api/src/modules/printers/receipt-data.service.ts`, at the top of `build()`:

```ts
    if (orderId === 0) return this.sampleReceipt();
```

and add:

```ts
  /** A fixed receipt for the Settings test button — no document needed. */
  private async sampleReceipt(): Promise<ReceiptData> {
    const company = await this.company();
    return {
      storeName: company.companyName || 'Morocom',
      storePhone: company.phone,
      orderNumber: 'TEST-0001',
      date: new Date().toLocaleString('fr-FR'),
      clientName: 'Test',
      items: [{ name: 'Article de test', qty: 1, unitPrice: 1, total: 1 }],
      subtotal: 1,
      total: 1,
      footer: 'Impression de test',
    };
  }
```

- [ ] **Step 3: Test the API change**

Add to `api/src/modules/printers/__tests__/receipt-data.service.spec.ts` (create it):

```ts
import { ReceiptDataService } from '../receipt-data.service';

describe('ReceiptDataService.build', () => {
  const svc = () =>
    new ReceiptDataService(
      { getRepository: () => ({ findOne: jest.fn() }) } as never,
      { findByEntity: jest.fn().mockResolvedValue({ values: { companyName: 'ACME' } }) } as never,
    );

  it('returns a sample receipt for the test-page marker', async () => {
    const data = await svc().build(0);
    expect(data.orderNumber).toBe('TEST-0001');
    expect(data.storeName).toBe('ACME');
  });

  it('does not look up an order for the test page', async () => {
    const findOne = jest.fn();
    const s = new ReceiptDataService(
      { getRepository: () => ({ findOne }) } as never,
      { findByEntity: jest.fn().mockResolvedValue({ values: {} }) } as never,
    );
    await s.build(0);
    expect(findOne).not.toHaveBeenCalled();
  });
});
```

Run: `cd api && pnpm test receipt-data`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backoffice/src/pages/configurations/Printers.tsx api/src/modules/printers
git commit -m "feat(print): test print exercises the real queue path"
```

---

### Task 7: Wire printing into the order and POS flows

**Files:**
- Modify: `backoffice/src/pages/OrderDetailPage.tsx`
- Modify: `backoffice/src/pages/OrderSuccessPage.tsx`

**Interfaces:**
- Consumes: `<PrintButton />`
- Produces: printing available where an operator actually needs it

- [ ] **Step 1: Order detail**

`handlePrint(type)` currently opens a PDF preview. Keep it — previewing an A4 document is still useful — and add a receipt `PrintButton` beside it in the action row near line 775:

```tsx
<PrintButton documentType="receipt" documentRef={Number(id)} label={t('print')} />
```

The existing delivery-note action stays on the PDF preview path.

- [ ] **Step 2: POS success**

In `OrderSuccessPage.tsx`, where `resolvedOrderId` is available, render beside the existing Printer icon action:

```tsx
{resolvedOrderId != null && (
  <PrintButton documentType="receipt" documentRef={resolvedOrderId} label={t('print')} />
)}
```

Do not auto-print. A sale can complete while the operator is still talking to the customer, and an unattended receipt is worse than a deliberate one.

- [ ] **Step 3: Verify**

Run: `cd backoffice && pnpm build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add backoffice/src/pages/OrderDetailPage.tsx backoffice/src/pages/OrderSuccessPage.tsx
git commit -m "feat(print): queue receipts from order detail and POS success"
```

---

### Task 8: Remove the browser ESC/POS builder and verify end to end

**Files:**
- Modify: `shared/components/PrintManager.ts`
- Verify: `backoffice`, `client`, `delivery-portal` builds

**Interfaces:**
- Produces: `PrintManager` reduced to types plus the manual `window.print()` fallback

- [ ] **Step 1: Delete `buildEscPos`**

The API owns rendering now, and nothing in the browser calls this. Remove `buildEscPos` from `shared/components/PrintManager.ts`, keeping `PrinterConfig`, `ReceiptData`, `ReceiptLine`, `PrintResult`, `printReceipt` and `detectPlatform` — `client/` and `delivery-portal/` still import them.

- [ ] **Step 2: Verify every app builds**

```bash
cd backoffice && pnpm build
cd ../client && pnpm build
cd ../delivery-portal && pnpm build
```
Expected: all succeed.

- [ ] **Step 3: Verify the API suite has not regressed**

Run: `cd api && pnpm test`
Expected: 20 failed / 2 suites — the known pre-existing inventory failures, unchanged. Any other failure is a regression.

- [ ] **Step 4: End-to-end against the running stack**

With Docker up and a fake printer on 9100:

```bash
node -e "require('net').createServer(s=>s.on('data',d=>process.stdout.write(d))).listen(9100)" &
cd print-agent && ORDERIUM_AGENT_HOME=/tmp/agent-e2e node dist/index.js &
```

In the backoffice: Settings → Printers → add a printer for warehouse 1 at `127.0.0.1:9100`; Agents → add agent → pair it with the printed code; then press **Test print**. The button must go Envoi… → Impression… → ✓ Imprimé, and the fake printer must receive ESC/POS bytes.

Then open an order and press Imprimer; confirm the same.

Finally stop the agent and press Imprimer again: the button must reach **En attente** and offer **Imprimer ici** — never silently opening the dialog.

- [ ] **Step 5: Clean up and commit**

```bash
git add shared/components/PrintManager.ts
git commit -m "refactor(print): drop the browser ESC/POS builder, the API owns rendering"
```

---

## Self-Review

**Spec coverage.** Frontend switch → Tasks 2, 3, 7; settings gains warehouse/kind/systemName → Task 4; Agents tab with pairing and online dots → Task 5; manual fallback with visible status → Tasks 2, 3; `buildEscPos` removed from the browser → Task 8.

**Deliberate deviations.**
- **`printing.mode` flag dropped** — it existed to make a behaviour change reversible, and there is no live print flow to revert to. Recorded in the findings above.
- **Client and delivery portals untouched.** Their `PrintButton`s are unused; converting them would be speculative work.
- **POS does not auto-print.** The spec did not require it, and an unattended receipt during a customer conversation is worse than a deliberate one.
- **Network discovery still deferred** — printers are configured by IP, as in Plan 2.

**Type consistency.** `IPrinter` (Task 1) is consumed by Tasks 4, 5 and 6. `QueuePrintJobDTO` (Task 1) is what `usePrint.print` (Task 2) takes and `PrintButton` (Task 3) constructs. `PrintState` (Task 2) is consumed in Tasks 3 and 6. `IPrintAgent` (Task 1) is consumed in Task 5. `documentRef: 0` as the test-page marker is defined in Task 6 and used only there.

**Ordering note.** Tasks 1–3 leave `Printers.tsx` uncompilable, since it still references removed fields; Task 4 repairs it. `pnpm build` is therefore only expected to pass from Task 4 onward — Steps before that check `tsc --noEmit` and expect scoped errors.
