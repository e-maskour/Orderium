import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from 'primereact/button';
import { AdminLayout } from './AdminLayout';
import { EmptyState } from './EmptyState';
import { useTenantModulesState } from './TenantStatusGuard';
import { useLanguage } from '../context/LanguageContext';
import {
  isPlanModuleEnabled,
  planLimitForPath,
  planModuleForPath,
  type PlanGatedModule,
} from '../lib/planAccess';
import type { TranslationKey } from '../lib/i18n';
import {
  SUBSCRIPTION_PATH,
  usePlanLimit,
  type SubscriptionResource,
} from '../modules/subscription';
import { PlanLimitScreen } from './PlanLimitNotice';

const BODY_KEYS: Record<PlanGatedModule, TranslationKey> = {
  pos: 'planLockedBody_pos',
  caisse: 'planLockedBody_caisse',
  reports: 'planLockedBody_reports',
  delivery: 'planLockedBody_delivery',
  clientRequests: 'planLockedBody_clientRequests',
};

/** Friendly "not in your plan" screen shown instead of a page that would 403. */
export function PlanLockedScreen({ module }: { module: PlanGatedModule }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div
        style={{
          maxWidth: '40rem',
          margin: '0 auto',
          padding: '2rem 1rem',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            background: 'var(--surface-card, #fff)',
            border: '1px solid var(--surface-border, #e2e8f0)',
            borderRadius: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: '#fff7ed',
                color: '#c2410c',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} aria-hidden />
              {t('planLockedBadge')}
            </span>
          </div>
          <EmptyState
            icon={Lock}
            title={t('planLockedTitle')}
            description={t(BODY_KEYS[module])}
            action={
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                }}
              >
                <Button
                  label={t('planSeeSubscription')}
                  onClick={() => navigate(SUBSCRIPTION_PATH)}
                />
                <Button
                  label={t('backToDashboard')}
                  outlined
                  onClick={() => navigate('/dashboard')}
                />
              </div>
            }
          />
        </div>
      </div>
    </AdminLayout>
  );
}

/**
 * Renders the plan-locked screen when the current URL belongs to a module the
 * tenant's plan does not include (/pos, /caisse, /analytics, /delivery-persons,
 * /client-requests). Must sit inside TenantStatusGuard.
 *
 * - While the status is loading on a gated path, nothing is rendered so the
 *   page does not fire calls the API would reject.
 * - When the status is unavailable it fails open: the API still enforces.
 */
export function PlanRouteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { modules, status } = useTenantModulesState();
  const module = planModuleForPath(pathname);
  const limitedResource = planLimitForPath(pathname);

  const gated = limitedResource ? (
    <PlanLimitRouteGate resource={limitedResource}>{children}</PlanLimitRouteGate>
  ) : (
    <>{children}</>
  );

  if (!module) return gated;
  if (status === 'loading') return null;
  if (status === 'ready' && !isPlanModuleEnabled(module, modules)) {
    return <PlanLockedScreen module={module} />;
  }
  return gated;
}

/**
 * Replaces a create screen with the "limit reached" screen once the plan
 * quota it consumes is used up. Usage is re-read every time the screen opens.
 * Fails open when the subscription cannot be loaded — the API still enforces.
 */
function PlanLimitRouteGate({
  resource,
  children,
}: {
  resource: SubscriptionResource;
  children: ReactNode;
}) {
  const { usage, planName, reached, loading } = usePlanLimit(resource, {
    refetchOnMount: 'always',
  });

  // Avoid flashing a form the user cannot save on the very first load.
  if (loading) return null;
  if (reached) {
    return (
      <PlanLimitScreen
        detail={{ resource, used: usage?.used, limit: usage?.max, plan: planName }}
      />
    );
  }
  return <>{children}</>;
}
