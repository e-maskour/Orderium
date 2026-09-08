/**
 * Response shapes for the platform metrics API.
 *
 * Plain interfaces rather than classes: these are read-only projections
 * assembled from SQL, never validated or instantiated as DTOs.
 */

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

export interface PlatformAlert {
  id: string;
  severity: AlertSeverity;
  kind:
    | 'quota-exceeded'
    | 'quota-near'
    | 'dormant'
    | 'error-rate'
    | 'collection-failed'
    | 'stale-metrics'
    | 'trial-ending'
    | 'activity-drop';
  tenantId: number | null;
  tenantName: string | null;
  message: string;
  value?: number;
}

export interface PlatformOverview {
  /** Reporting day the snapshot columns describe. */
  date: string;
  /** When the nightly collector last completed a tenant, or null if never. */
  lastCollectedAt: string | null;
  /** Tenants whose latest snapshot is older than a day. */
  staleTenants: number;
  totals: PlatformTotals;
  /** Change in totals versus the comparable window immediately before. */
  deltas: {
    orders: number | null;
    users: number | null;
    revenue: number | null;
    activeUsers: number | null;
  };
  trend: PlatformTrendPoint[];
  alerts: PlatformAlert[];
}

export interface TenantMetricRow {
  tenantId: number;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  metricDate: string | null;
  collectedAt: string | null;
  collectionError: string | null;

  ordersTotal: number;
  ordersByOrigin: Record<string, number>;
  ordersThisMonth: number;
  /** Orders created in the last 30 days, summed from daily deltas. */
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

export interface QuotaLine {
  used: number;
  limit: number;
  /** Null when the limit is 0 or unset — percentage would be meaningless. */
  pct: number | null;
  exceeded: boolean;
}

export interface TenantQuotaUsage {
  users: QuotaLine;
  products: QuotaLine;
  ordersPerMonth: QuotaLine;
  storageMb: QuotaLine;
  /** Highest percentage across all lines — what the table sorts and colours by. */
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
