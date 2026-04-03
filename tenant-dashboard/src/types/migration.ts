export type MigrationStatus = 'applied' | 'pending';
export type MigrationHealth = 'up-to-date' | 'pending' | 'failed';
export type MigrationOperation = 'run' | 'revert' | 'run-all';
export type MigrationRunStatus = 'success' | 'failed';

export interface MigrationInfo {
  name: string;
  timestamp: number;
  status: MigrationStatus;
}

export interface MigrationRunLog {
  id: number;
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  operation: MigrationOperation;
  status: MigrationRunStatus;
  migrationsExecuted: string[] | null;
  errorMessage: string | null;
  durationMs: number | null;
  executedAt: string;
}

export interface TenantMigrationStatus {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  health: MigrationHealth;
  pendingCount: number;
  appliedCount: number;
  totalCount: number;
  migrations: MigrationInfo[];
  lastFailedLog: MigrationRunLog | null;
}

export interface RunAllResult {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  status: 'success' | 'failed' | 'skipped';
  migrationsRun: number;
  durationMs: number;
  errorMessage: string | null;
}

export interface LogsFilterParams {
  limit?: number;
  tenantId?: number;
  status?: string;
  from?: string;
  to?: string;
}
