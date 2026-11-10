export type TenantStatus =
  | 'trial'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'disabled'
  | 'archived'
  | 'deleted';

export type SubscriptionPlan = 'trial' | 'starter' | 'business' | 'pro' | 'enterprise';

/** Feature flags enforced by the API for a plan / tenant. */
export interface PlanFeatures {
  pos: boolean;
  delivery: boolean;
  client_portal: boolean;
  reports: boolean;
}

export type PlanFeatureKey = keyof PlanFeatures;

/** Resource limits shared by plans and tenants. `-1` means unlimited. */
export interface PlanLimits {
  maxUsers: number;
  maxProducts: number;
  maxWarehouses: number;
  maxDeliveryPersons: number;
  maxOrdersPerMonth: number;
  maxStorageMb: number;
}

export type PlanLimitKey = keyof PlanLimits;

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  databaseName: string;
  databaseHost: string;
  databasePort: number;
  isActive: boolean;
  logoUrl: string | null;
  primaryColor: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  // Status
  status: TenantStatus;
  previousStatus: TenantStatus | null;
  statusChangedAt: string | null;
  statusReason: string | null;
  // Subscription
  subscriptionPlan: SubscriptionPlan;
  trialDays: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  autoRenew: boolean;
  // Limits (-1 = unlimited)
  maxUsers: number;
  maxProducts: number;
  maxWarehouses: number;
  maxDeliveryPersons: number;
  maxOrdersPerMonth: number;
  maxStorageMb: number;
  features: PlanFeatures;
  // Computed (may be included in API responses)
  trialDaysRemaining?: number | null;
  // Meta
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface TenantUrls {
  admin: string;
  client: string;
  delivery: string;
}

export interface CreateTenantResponse extends Tenant {
  urls: TenantUrls;
}

export interface TenantStats {
  usersCount: number;
  ordersCount: number;
  dbSizeBytes: number;
  dbSizeHuman: string;
  storageUsedBytes: number;
  storageUsedHuman: string;
}

export interface PaginatedTenants {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListTenantsParams {
  search?: string;
  status?: TenantStatus | 'all';
  plan?: SubscriptionPlan | 'all';
  sortBy?: 'name' | 'createdAt' | 'subscriptionPlan' | 'status';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  subscriptionPlan?: SubscriptionPlan;
  trialDays?: number;
  maxUsers?: number;
  maxProducts?: number;
  maxWarehouses?: number;
  maxDeliveryPersons?: number;
  maxOrdersPerMonth?: number;
  maxStorageMb?: number;
  features?: PlanFeatures;
  settings?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  subscriptionPlan?: SubscriptionPlan;
  maxUsers?: number;
  maxProducts?: number;
  maxWarehouses?: number;
  maxDeliveryPersons?: number;
  maxOrdersPerMonth?: number;
  maxStorageMb?: number;
  features?: PlanFeatures;
  autoRenew?: boolean;
  settings?: Record<string, unknown>;
}

/** A row of `GET /admin/plans`. Prices are HT; limits use `-1` for unlimited. */
export interface SubscriptionPlanData extends PlanLimits {
  id: string;
  name: SubscriptionPlan;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
}

export interface ActivityLogEntry {
  id: string;
  tenantId: number;
  action: string;
  details: Record<string, unknown>;
  performedBy: string | null;
  createdAt: string;
}

export interface TenantPortalAccess {
  clientPortal: boolean;
  deliveryPortal: boolean;
}

export interface TenantModulesConfig {
  commandes: boolean;
  pos: boolean;
  caisse: boolean;
  devis: boolean;
  factures: boolean;
  bonLivraison: boolean;
  paiements: boolean;
  clients: boolean;
  fournisseurs: boolean;
  livreurs: boolean;
  factureAchat: boolean;
  demandeDesPrix: boolean;
  bonAchat: boolean;
  paiementsAchat: boolean;
  products: boolean;
  warehouse: boolean;
  category: boolean;
  portals: TenantPortalAccess;
}

export type TenantModuleKey = Exclude<keyof TenantModulesConfig, 'portals'>;

export const DEFAULT_MODULES: TenantModulesConfig = {
  commandes: true,
  pos: false,
  caisse: false,
  devis: false,
  factures: false,
  bonLivraison: false,
  paiements: false,
  clients: true,
  fournisseurs: true,
  livreurs: false,
  factureAchat: false,
  demandeDesPrix: false,
  bonAchat: false,
  paiementsAchat: false,
  products: true,
  warehouse: true,
  category: true,
  portals: {
    clientPortal: false,
    deliveryPortal: false,
  },
};
