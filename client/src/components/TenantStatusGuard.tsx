import { useState, useEffect, useRef, type ReactNode } from 'react';
import { BlockedScreen } from './BlockedScreen';

import { API_ROUTES } from '@/common/api-routes';

type TenantStatus =
  | 'trial'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'disabled'
  | 'archived'
  | 'deleted';

interface TenantPublicStatus {
  status: TenantStatus;
  isActive: boolean;
  statusReason: string | null;
  trialDaysRemaining: number | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  modules: {
    portals: {
      clientPortal: boolean;
      deliveryPortal: boolean;
    };
  } | null;
}

interface Props {
  children: ReactNode;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function extractTenantSlug(): string | null {
  const hostname = window.location.hostname;
  const match = hostname.match(/^([a-z0-9-]+)-(app)\./i);
  if (match) return match[1].toLowerCase();
  // Fallback: first subdomain segment without suffix (dev environments)
  const subdomain = hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
  if (subdomain) return subdomain[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase();
  return null;
}

let cachedStatus: TenantPublicStatus | null | undefined = undefined;
let fetchPromise: Promise<TenantPublicStatus | null> | null = null;

function fetchTenantStatus(): Promise<TenantPublicStatus | null> {
  if (cachedStatus !== undefined) return Promise.resolve(cachedStatus);
  if (fetchPromise) return fetchPromise;

  const headers: Record<string, string> = {};
  const slug = extractTenantSlug();
  if (slug) headers['X-Tenant-ID'] = slug;

  fetchPromise = fetch(`${API_BASE_URL}${API_ROUTES.ONBOARDING.PUBLIC_STATUS}`, { headers })
    .then(async (res) => {
      if (!res.ok) {
        cachedStatus = null;
        return null;
      }
      const body = await res.json();
      const status: TenantPublicStatus = body?.data ?? null;
      cachedStatus = status;
      return status;
    })
    .catch(() => {
      cachedStatus = null;
      fetchPromise = null;
      return null;
    });

  return fetchPromise;
}

export function TenantStatusGuard({ children }: Props) {
  const [tenantStatus, setTenantStatus] = useState<TenantPublicStatus | null | undefined>(
    cachedStatus,
  );
  const fetched = useRef(cachedStatus !== undefined);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchTenantStatus().then(setTenantStatus);
  }, []);

  // While loading, render children (avoids flash of blocked screen on normal tenants)
  if (tenantStatus === undefined || tenantStatus === null) {
    return <>{children}</>;
  }

  const { status, trialEndsAt } = tenantStatus;

  if (status === 'suspended') return <BlockedScreen reason="suspended" />;
  if (status === 'disabled') return <BlockedScreen reason="disabled" />;
  if (status === 'archived' || status === 'deleted') return <BlockedScreen reason="disabled" />;
  if (status === 'expired') return <BlockedScreen reason="subscription_expired" />;

  if (status === 'trial' && trialEndsAt && new Date(trialEndsAt).getTime() < Date.now()) {
    return <BlockedScreen reason="trial_expired" />;
  }

  // Portal access check — if the super-admin disabled client portal, block entry
  if (tenantStatus.modules !== null && tenantStatus.modules?.portals.clientPortal === false) {
    return <BlockedScreen reason="portal_disabled" />;
  }

  return <>{children}</>;
}
