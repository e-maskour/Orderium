# Print Agent & Print Job Queue — Design

**Date:** 2026-09-09
**Status:** Approved, ready for implementation planning
**Supersedes:** browser-direct printing in `shared/components/PrintManager.ts`

## Problem

Receipt printing currently runs entirely in the browser. `PrintManager.printReceipt()`
tries four transports in order: Epson ePOS, Star WebPRNT, QZ Tray, then `window.print()`.

The first two dial plain `http://<lan-ip>` from a page served over `https://`. Browsers
block this under the mixed-content rule, with no override. QZ Tray is rarely installed.
So every print falls through to `window.print()` and the operator gets an OS dialog —
the exact outcome the fallback chain was built to avoid.

The failure is invisible: `usePrinter` records `status: 'fallback'` in `print_jobs` but
nothing surfaces it. `discoverPrinters()` is affected the same way — its 508 `http://`
probes are all blocked, so it can never find a printer.

The browser sandbox cannot be worked around. The fix is to move printing out of the
browser into a small local service.

## Goals

- Silent printing of thermal receipts (ESC/POS) and A4 documents (PDF) from any device,
  including phones and tablets that are not on the printer's network.
- Operators always see the true state of a print. No silent failures.
- Receipt formatting changes ship as an API deploy, never as a field update to shop machines.
- Per-shop routing: a tenant with several branches prints in the right one.
- Cross-platform agent: Windows, Linux, macOS.

## Non-goals (v1)

- Cash drawer pulse and kitchen-printer routing.
- Agent auto-update.
- Replacing the existing PDF generation pipeline (`api/src/modules/pdf/`), which is reused as-is.

## Architecture

```
Backoffice / POS / client / delivery-portal
        |  POST /print-jobs  (plain HTTPS to our own API)
        v
API  --  print_jobs row (durable source of truth)
     --  renders ESC/POS on demand
     --  notifies via SSE, fanned out across instances over Redis
        |  SSE
        v
print-agent  (one per warehouse, on a shop machine)
        |                         |
        v TCP 9100 / USB          v OS spooler
   thermal printer (ESC/POS)   A4 laser (PDF)
```

The browser never addresses a printer. Its only role is creating a job through the same
authenticated API it already uses for everything else.

### Rendering location: server (thin agent)

The API produces the final bytes; the agent is a transport. Rejected alternative: the
agent renders from structured data.

Rationale: the dominant lifetime cost of this system is updating agents in the field,
across three operating systems and many shops. A thin agent means receipt layout, wording,
VAT presentation and branding are all API deploys that take effect everywhere at once,
and a shop running a months-old agent still prints a current receipt. It also keeps
`buildEscPos()` next to the pricing and order logic it depends on, unit-testable in CI.

### Package layout

The agent is a new package in the existing pnpm workspace: `print-agent/`, added to
`pnpm-workspace.yaml`. It shares types with `shared/`.

## Data model

All tables are tenant-scoped and live in the tenant database, accessed through
`TenantConnectionService.getRepository()` per the project rule.

### `printers` (modified)

The current `brand` column conflates manufacturer with transport — `qztray` and `browser`
are not brands. Split into orthogonal fields:

```ts
warehouseId: number                            // NEW  FK -> warehouses; routes jobs to a shop
kind: 'thermal' | 'document'                   // NEW  selects the render path
systemName: string | null                      // NEW  OS spooler queue name (usb/system)
brand: 'epson' | 'star' | 'generic'            // narrowed: ESC/POS dialect only
connectionType: 'network' | 'usb' | 'system'   // narrowed: 'browser' removed
// unchanged: id, name, model, ip, port, paperWidth, isDefault,
//            documentTypes, isEnabled, lastSeenAt, createdAt, updatedAt
```

Unique index moves from `['name']` to `['warehouseId', 'name']`, so two branches can each
have a printer named "Caisse 1".

`kind` exists because a thermal receipt printer and an A4 laser need entirely different
render paths, and `documentTypes` alone does not tell the server which kind of device it
is addressing.

### `print_jobs` (modified — becomes a queue)

Today this is a write-only log. It becomes the durable queue and the source of truth.

```ts
status: 'queued' | 'claimed' | 'printing' | 'done' | 'failed' | 'cancelled'
warehouseId: number          // denormalized so routing survives printer deletion
agentId: string | null       // agent holding the claim
idempotencyKey: string       // UNIQUE; a double-click cannot print twice
attempts: number
maxAttempts: number          // default 3
lastError: string | null
queuedAt / claimedAt / completedAt: timestamptz
documentId: number           // was uuid; documents use integer ids (see pdf.controller)
// retained: printerId, userId, documentType, durationMs
// deprecated: method — kept nullable so existing history stays readable, no longer written
```

### `print_agents` (new)

```ts
id: uuid
name: string
warehouseId: number
keyHash: string              // argon2id
keyPrefix: string            // first 8 chars, for display only
pairingCode: string | null   // single-use
pairingExpiresAt: timestamptz | null
lastSeenAt: timestamptz | null
version: string | null       // reported by heartbeat
platform: string | null      // win32 | linux | darwin
isEnabled: boolean
revokedAt: timestamptz | null
```

### Payload is rendered on claim, not on enqueue

The job row records what to print (`documentType`, `documentId`, `printerId`), never the
bytes. The agent fetches rendered output when it claims the job. This keeps rows small and
means reprinting an old order uses the current template rather than a stale snapshot.

### Migration of existing rows

Existing `printers` rows are assigned to the tenant's first warehouse; `kind` is inferred
from `paperWidth` (80mm -> `thermal`, otherwise `document`); `brand` values `qztray` and
`browser` are rewritten to `generic`. Existing `print_jobs` rows map `success -> done`, `failed -> failed`, `fallback -> done`.
The `document_id` column changes from uuid to integer, and existing uuid values cannot be
converted: the migration adds the integer column and leaves historical rows null rather
than discarding the history. `method` is retained as a nullable legacy column and simply
stops being written. Non-destructive and reversible.

## Authentication

The API resolves tenants from an `X-Tenant-ID` header via the existing `TenantMiddleware`.
The agent uses the same mechanism — no new tenant-resolution machinery.

**Pairing.** An operator creates an agent in the backoffice and receives a pairing string
shaped `<tenantSlug>-<8 chars>`, for example `acme-4F7K2Q9X`. The slug prefix is how the
agent learns which value to send as `X-Tenant-ID`, so the operator configures nothing by
hand. The agent exchanges the string once at `POST /print-agents/pair` for a 32-byte key,
stored hashed (argon2id) server-side and on disk agent-side. The code half is single-use
with a 15-minute TTL and the endpoint is rate-limited.

**Per-request.** The agent sends `X-Tenant-ID` plus its key. A new `@AgentRoute()`
decorator and `AgentAuthGuard` follow the existing `@Public()` / `@PortalRoute()` pattern
in `api/src/modules/auth/decorators/`. The guard resolves the tenant database from the
header, verifies the key hash within it, and checks `isEnabled` / `revokedAt` on every
request (cached 60s, matching the existing pattern in `printers.service.ts`).

**Scope.** A key is bound to one warehouse, enforced inside the query rather than by
filtering results. An agent cannot address another shop's jobs.

## API surface

Response codes extend the existing `PRI` (printers) and `PJB` (print jobs) blocks in
`api/src/common/response-codes.ts`; agent endpoints use a new `PAG` prefix. Note `PRT` is
already taken by the Portal controller and must not be reused. All controller methods
return `ApiRes()` and carry `@ApiOperation` / `@ApiResponse`.

Permissions reuse the existing `printers` access module, which already defines
`view / create / edit / delete / print`. No new access module is required.

### Caller endpoints (JWT)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/print-jobs` | `{documentType, documentId, printerId?, idempotencyKey}` -> job |
| GET | `/print-jobs/:id` | status polling for the print button |
| GET | `/print-jobs` | history; adds `status` and `warehouseId` filters |
| POST | `/print-jobs/:id/retry` | operator recovery |
| POST | `/print-jobs/:id/cancel` | operator recovery |
| GET | `/print-agents` | list with derived online state |
| POST | `/print-agents` | create, returns pairing code |
| DELETE | `/print-agents/:id` | revoke |

`printers` CRUD is unchanged apart from the new fields.

The `print-jobs` controller requires `@PortalRoute()`: `client/` and `delivery-portal/`
both contain a `PrintButton`, so portal-scoped tokens must reach it. The `printers` and
`print-agents` controllers remain backoffice-only. `CLAUDE.md` must be updated to record
this.

### Agent endpoints (`@AgentRoute()`)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/print-agents/pair` | pairing code -> agent key |
| GET | `/print-jobs/stream` | SSE notifications for this warehouse |
| POST | `/print-jobs/:id/claim` | atomic claim; `409` if another agent won |
| GET | `/print-jobs/:id/payload` | ESC/POS bytes (base64) or short-TTL PDF URL |
| POST | `/print-jobs/:id/result` | `{status, durationMs, error?}` |
| POST | `/print-agents/heartbeat` | every 30s: version, platform, per-printer reachability |

`GET /print-jobs/:id/payload` serves only the agent currently holding the claim. PDF
payloads are short-TTL presigned MinIO URLs, never permanent links.

## Agent

```
print-agent/src/
  index.ts         bootstrap, graceful shutdown (finish in-flight job)
  config.ts        load/persist config at an OS-appropriate path
  pairing.ts       first-run pairing
  api-client.ts    HTTP + SSE with reconnect and Last-Event-ID
  job-runner.ts    claim -> payload -> device -> result, with backoff
  devices/
    index.ts       interface Device { print(payload): Promise<void> }
    thermal-tcp.ts net.Socket -> ip:9100
    thermal-usb.ts node-thermal-printer
    spooler.ts     pdf-to-printer (win32) | lp/CUPS (linux, darwin)
  heartbeat.ts     30s liveness plus printer reachability probe
  discovery.ts     LAN scan (mDNS + TCP 9100 probe), reports to the API
  logger.ts        rotating local log file for phone support
```

The `Device` interface is the only place OS-specific behaviour lives; `job-runner` is
platform-agnostic. Packaging produces a Windows Service, a systemd unit, and a launchd
plist from one codebase.

## Print flow

1. Operator clicks Print. The frontend POSTs a job with a deterministic idempotency key
   of `<documentType>:<documentId>:<printerId>`, so repeated clicks on one button collapse
   into a single job. An explicit Reprint action appends a counter to form a fresh key.
2. The API resolves the target printer — explicit `printerId`, otherwise the warehouse's
   default printer for that `documentType` — inserts a `queued` row, and publishes to the
   Redis channel `print:<tenantSlug>:<warehouseId>`.
3. Whichever API instance holds that warehouse's SSE connection emits `{jobId}`.
4. The agent claims it:
   `UPDATE print_jobs SET status='claimed', agent_id=?, claimed_at=now() WHERE id=? AND status='queued' RETURNING *`.
   Losing the race returns `409` and is not an error condition.
5. The agent fetches the payload. The API renders ESC/POS using that printer's
   `paperWidth` and `brand` dialect, or returns a presigned PDF URL for `kind: 'document'`.
6. The agent transitions the job to `printing`, writes to the device, and reports the result.
7. The button shows success, or "Queued — printer offline" with an explicit
   "Print here instead" action.

A duplicate POST with the same idempotency key returns the existing job with `200`
rather than creating a second one.

## Failure handling

**Never auto-reprint work that may have physically printed.** Recovery depends on how far
the agent got before dying:

| State at failure | Meaning | Recovery |
| --- | --- | --- |
| `claimed` | bytes not yet sent to the device | safe: returned to `queued`, `attempts++` |
| `printing` | bytes already sent | never auto-retried: set `failed`, operator decides |

A reaper running on `@nestjs/schedule` (already used by
`notifications/scheduled-notifications.service.ts`) sweeps jobs stuck for more than 60
seconds and applies the table above. This distinction is what prevents duplicate receipts
and till discrepancies.

**Stale jobs expire.** A job still `queued` after 15 minutes becomes `cancelled`, so an
agent reconnecting the next day does not print yesterday's receipts.

**Push is an optimisation, not the guarantee.** On SSE reconnect, and every 30 seconds
regardless, the agent sweeps `GET /print-jobs?status=queued`. If Redis blips or a
notification is dropped, printing degrades to roughly 30 seconds of latency rather than
failing.

**Device errors** (out of paper, unreachable) fail the job with the device message, and
the next heartbeat marks that printer offline in the UI.

**No agent online.** Jobs remain queued within the staleness window. The UI shows the
warehouse as offline and offers the manual browser fallback. Nothing happens silently.

## Frontend changes

- `usePrinter()` becomes `usePrint()`: POSTs a job, then polls its status for about 10s.
- `PrintButton` (backoffice, client, delivery-portal) gains three visible states: printing,
  printed, and queued-with-fallback.
- `PrintableReceipt` and `window.print()` are retained, but fire only on explicit operator
  action, and gain `@page { size: 80mm auto; margin: 0 }`.
- `shared/components/PrintManager.ts` is deleted. `buildEscPos()` moves to
  `api/src/modules/printers/escpos/`.
- `backoffice/src/pages/configurations/Printers.tsx` gains a warehouse selector, `kind` and
  `systemName` fields, and a new Agents tab (pairing, online indicators, revoke). The
  existing list, form, document-type assignment and history tab are retained; the history
  tab's Method column is replaced by the agent name, falling back to the legacy `method`
  value for rows printed before this change.

## Testing

Tests lead each unit, per the project's TDD workflow.

- **ESC/POS golden tests**: byte-for-byte snapshots for 80mm and 148mm, and for Epson
  versus Star cut sequences. Pure functions, so this is where formatting regressions are
  caught cheaply.
- **Job state machine**: only legal transitions permitted.
- **Claim atomicity**: N concurrent claims yield exactly one `200` and N-1 `409`.
- **Guards**: wrong tenant, revoked key, another warehouse's job.
- **Agent**: a fake printer via `net.createServer()` asserting exact bytes received; the
  spooler is mocked behind the `Device` interface.
- **E2E**: docker-compose brings up API, agent and a fake printer socket; an order in
  produces the expected bytes out.

## Rollout

| Phase | Content | User-visible |
| --- | --- | --- |
| 0 | Remove dead browser transports; honest `window.print()` with 80mm CSS | Yes |
| 1 | Schema, API, tests | No |
| 2 | Agent and cross-platform packaging | No |
| 3 | Frontend switch behind per-tenant flag `printing.mode = browser \| agent` | Yes |

Each phase ships independently. Phase 0 changes little in practice, because the browser
dialog is already what every user gets today — it removes code that only pretended to do
something else, and makes the resulting receipt correctly formatted. Pilot phase 3 on a
single shop, then widen. Rollback is flipping the flag to `browser`; there is no migration
to undo.

## Decisions log

| Decision | Choice | Rejected |
| --- | --- | --- |
| Where printing happens | Local agent outside the browser | Browser-direct (blocked by mixed content); QZ Tray only (paid cert, no mobile) |
| Where bytes are rendered | Server (thin agent) | Agent-side rendering (field updates become dominant cost) |
| Shop identity | Reuse `warehouses` | New `locations` module; agent-local config only |
| Agent auth | Pairing code to hashed per-agent key | Service user with JWT; shared static secret |
| Job transport | SSE push over Redis fan-out, with polling sweep as guarantee | Short polling only; WebSocket |
| v1 document scope | Thermal receipts and A4 documents | Receipts only |
| Failure behaviour | Queue, show real status, manual fallback | Automatic silent browser fallback; hard fail |
| Platforms | Windows, Linux, macOS behind one `Device` interface | Windows only; dedicated hardware appliance |
