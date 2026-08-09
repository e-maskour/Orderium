export type SeederHealth = 'converged' | 'pending' | 'error';
export type SeederOperation = 'run' | 'run-tenant' | 'run-fleet';
export type SeederRunStatus = 'success' | 'failed';

export interface SeederOptionDef {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'password';
  required?: boolean;
  /** Present when the option has a consequence worth spelling out. */
  danger?: string;
  minLength?: number;
  placeholder?: string;
}

export interface SeederCatalogueEntry {
  key: string;
  name: string;
  description: string;
  privileged: boolean;
  options: SeederOptionDef[];
}

export interface SeederStatusInfo extends SeederCatalogueEntry {
  status: SeederHealth;
  /** Declared items absent from this tenant. Meaningless when status is error. */
  missing: number;
  detail: string;
  lastRunAt: string | null;
}

export interface TenantSeederStatus {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  health: SeederHealth;
  pendingCount: number;
  convergedCount: number;
  errorCount: number;
  totalCount: number;
  seeders: SeederStatusInfo[];
  lastFailedLog: SeederRunLog | null;
}

export interface SeederRunLog {
  id: number;
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  seederKey: string;
  seederName: string;
  operation: SeederOperation;
  status: SeederRunStatus;
  created: number;
  pruned: number;
  /** Option names only — values are never sent to the client. */
  optionsUsed: string[] | null;
  detail: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  executedAt: string;
}

export interface FleetRunResult {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  status: 'success' | 'failed' | 'skipped';
  created: number;
  pruned: number;
  detail: string | null;
  durationMs: number;
  errorMessage: string | null;
}

export type SeederOptions = Record<string, unknown>;

export interface SeederLogsFilterParams {
  limit?: number;
  tenantId?: number;
  seederKey?: string;
  status?: string;
  from?: string;
  to?: string;
}

/**
 * The seeder-first pivot of the same payload: one entry per seeder, listing
 * the tenants that have drifted from it.
 */
export interface SeederPivot {
  key: string;
  name: string;
  description: string;
  privileged: boolean;
  options: SeederOptionDef[];
  pendingTenants: TenantSeederStatus[];
  errorTenants: TenantSeederStatus[];
  convergedCount: number;
  totalTenants: number;
}
