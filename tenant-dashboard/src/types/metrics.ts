import type { TenantStatus } from './tenant';

/** Mirrors `api/src/modules/platform-metrics/dto/metrics-response.dto.ts`. */

export interface PlatformTotals {
  tenants: number;
  activeTenants: number;
  trialTenants: number;
  orders: number;
  ordersByOrigin: Record<string, number>;
  ordersThisMonth: number;
  users: number;
  products: number;
  quotes: number;
  invoices: number;
  revenue: number;
  dbSizeBytes: number;
  storageBytes: number;
  activeUsers: number;
  apiCalls: number;
}

export interface PlatformTrendPoint {
  date: string;
  orders: number;
  quotes: number;
  invoices: number;
  activeUsers: number;
  apiCalls: number;
  errors: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertKind =
  | 'quota-exceeded'
  | 'quota-near'
  | 'dormant'
  | 'error-rate'
  | 'collection-failed'
  | 'stale-metrics'
  | 'trial-ending'
  | 'activity-drop';

export interface PlatformAlert {
  id: string;
  severity: AlertSeverity;
  kind: AlertKind;
  tenantId: number | null;
  tenantName: string | null;
  message: string;
  value?: number;
}

export interface PlatformOverview {
  date: string;
  lastCollectedAt: string | null;
  staleTenants: number;
  totals: PlatformTotals;
  deltas: {
    orders: number | null;
    users: number | null;
    revenue: number | null;
    activeUsers: number | null;
  };
  trend: PlatformTrendPoint[];
  alerts: PlatformAlert[];
}

export interface QuotaLine {
  used: number;
  limit: number;
  pct: number | null;
  exceeded: boolean;
}

export interface TenantQuotaUsage {
  users: QuotaLine;
  products: QuotaLine;
  ordersPerMonth: QuotaLine;
  storageMb: QuotaLine;
  worstPct: number | null;
}

export interface TenantHealthSummary {
  tenantId: number;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  errorRate: number;
  slowRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
}

export interface TenantMetricRow {
  tenantId: number;
  name: string;
  slug: string;
  status: TenantStatus;
  subscriptionPlan: string;
  metricDate: string | null;
  collectedAt: string | null;
  collectionError: string | null;

  ordersTotal: number;
  ordersByOrigin: Record<string, number>;
  ordersThisMonth: number;
  orders30d: number;
  quotesTotal: number;
  invoicesTotal: number;
  invoicesUnpaid: number;
  productsTotal: number;
  usersTotal: number;
  usersAdmin: number;
  partnersCustomers: number;
  partnersSuppliers: number;
  revenueTotal: number;

  activeUsers: number;
  apiCalls: number;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;

  dbSizeBytes: number;
  dbSizeHuman: string;
  storageBytes: number;
  storageHuman: string;

  quota: TenantQuotaUsage;
  health: TenantHealthSummary | null;
  riskScore: number;
  riskReasons: string[];
}

export interface HealthBucketPoint {
  bucketStart: string;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  p95LatencyMs: number;
}

export interface PlatformHealth {
  windowHours: number;
  totals: TenantHealthSummary;
  series: HealthBucketPoint[];
  worstTenants: Array<TenantHealthSummary & { name: string; slug: string }>;
}

export interface SeriesPoint {
  date: string;
  [metric: string]: string | number;
}

export interface TenantSeries {
  tenantId: number;
  from: string;
  to: string;
  metrics: string[];
  points: SeriesPoint[];
}

export interface CollectionRunResult {
  date: string;
  tenantsProcessed: number;
  tenantsFailed: number;
  durationMs: number;
  failures: Array<{ tenantId: number; slug: string; error: string }>;
}

export interface MetricsRangeParams {
  from?: string;
  to?: string;
}

export type TenantMetricSortKey =
  | 'name'
  | 'ordersTotal'
  | 'ordersThisMonth'
  | 'usersTotal'
  | 'productsTotal'
  | 'quotesTotal'
  | 'invoicesTotal'
  | 'activeUsers'
  | 'apiCalls'
  | 'dbSizeBytes'
  | 'storageBytes'
  | 'revenueTotal'
  | 'lastActivityAt';

export interface TenantMetricsListParams extends MetricsRangeParams {
  search?: string;
  status?: string;
  sortBy?: TenantMetricSortKey;
  sortOrder?: 'ASC' | 'DESC';
}
