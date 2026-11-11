import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Gauge } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';
import {
  PLAN_LIMIT_EVENT,
  SUBSCRIPTION_PATH,
  SUBSCRIPTION_QUERY_KEY,
  subscriptionService,
  useCurrentSubscription,
  type PlanLimitDialogDetail,
  type SubscriptionResource,
} from '../modules/subscription';

/** Builds the localized sentence + "used / limit" counter for a reached limit. */
function usePlanLimitText(detail: PlanLimitDialogDetail) {
  const { t, language } = useLanguage();
  const fmt = useMemo(
    () => new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : 'fr-FR'),
    [language],
  );

  const amount = (resource: SubscriptionResource | undefined, value: number): string => {
    if (resource !== 'storageMb') return fmt.format(value);
    if (value >= 1024) {
      return `${fmt.format(Math.round((value / 1024) * 10) / 10)} ${t('subscriptionUnitGb')}`;
    }
    return `${fmt.format(Math.round(value))} ${t('subscriptionUnitMb')}`;
  };

  const { resource, used, limit } = detail;
  const plan = subscriptionService.planDisplayName(detail.plan) || '';
  const hasNumbers = resource !== undefined && limit !== undefined && limit >= 0;

  if (!hasNumbers) {
    return {
      body: detail.message || t('planErrorLimitFallback'),
      counter: null as string | null,
    };
  }

  const usedValue = used ?? limit;
  const bodyKey: TranslationKey =
    limit === 0
      ? 'planLimitBodyNone'
      : resource === 'storageMb'
        ? 'planLimitBodyStorage'
        : resource === 'ordersPerMonth'
          ? 'planLimitBodyOrders'
          : 'planLimitBody';

  const body = t(bodyKey)
    .replace('{plan}', plan)
    .replace('{limit}', amount(resource, limit))
    .replace('{used}', amount(resource, usedValue))
    .replace('{unit}', t(`planLimitUnit_${resource}` as TranslationKey));

  const counter = t('planLimitUsage')
    .replace('{used}', amount(resource, usedValue))
    .replace('{limit}', amount(resource, limit));

  return { body, counter };
}

interface PlanLimitCardProps {
  detail: PlanLimitDialogDetail;
  actions: ReactNode;
}

/** Shared content of the full-page screen and the dialog. */
function PlanLimitCard({ detail, actions }: PlanLimitCardProps) {
  const { t } = useLanguage();
  const { body, counter } = usePlanLimitText(detail);

  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
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
        <Gauge size={14} aria-hidden />
        {t('planLimitBadge')}
      </span>

      <h2
        style={{
          margin: '1rem 0 0.5rem',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--text-color, #0f172a)',
        }}
      >
        {t('planLimitTitle')}
      </h2>

      {counter && (
        <div style={{ margin: '0.75rem auto 1rem', maxWidth: '18rem' }}>
          <div
            dir="ltr"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#c2410c',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counter}
          </div>
          <div
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '0.5rem',
              borderRadius: '999px',
              background: '#fed7aa',
              overflow: 'hidden',
              marginTop: '0.5rem',
            }}
          >
            <div style={{ width: '100%', height: '100%', background: '#ea580c' }} />
          </div>
        </div>
      )}

      <p
        style={{
          margin: '0 auto',
          maxWidth: '30rem',
          lineHeight: 1.6,
          color: 'var(--text-color-secondary, #475569)',
        }}
      >
        {body}
      </p>
      <p
        style={{
          margin: '0.75rem auto 1.25rem',
          maxWidth: '30rem',
          fontSize: '0.8125rem',
          color: 'var(--text-color-secondary, #64748b)',
        }}
      >
        {t('planLimitKeepWorking')}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {actions}
      </div>
    </div>
  );
}

/**
 * Full-page replacement for a create screen (/products/create, /pos…) when
 * the plan limit for that resource is reached. Only that screen is blocked.
 */
export function PlanLimitScreen({ detail }: { detail: PlanLimitDialogDetail }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

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
          <PlanLimitCard
            detail={detail}
            actions={
              <>
                <Button
                  label={t('planLimitChangePlan')}
                  onClick={() => navigate(SUBSCRIPTION_PATH)}
                />
                <Button label={t('planLimitBack')} outlined onClick={goBack} />
              </>
            }
          />
        </div>
      </div>
    </AdminLayout>
  );
}

/**
 * Global "limit reached" dialog. Opened by `openPlanLimitDialog()` — from a
 * guarded "Add" button or from the API interceptor when a save hits a limit.
 * Must be mounted once inside the router and the query client.
 */
export function PlanLimitDialogHost() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<PlanLimitDialogDetail | null>(null);
  // Only while the dialog is open: the host is mounted on every page, login included.
  const { data: subscription } = useCurrentSubscription({ enabled: detail !== null });

  useEffect(() => {
    const onOpen = (event: Event) => {
      const next = (event as CustomEvent<PlanLimitDialogDetail>).detail ?? {};
      setDetail(next);
      // Usage changed (or is stale) — refresh so the gates and counters agree.
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    };
    window.addEventListener(PLAN_LIMIT_EVENT, onOpen);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onOpen);
  }, [queryClient]);

  // Fill the numbers the error did not carry from the current usage.
  const resolved: PlanLimitDialogDetail | null = useMemo(() => {
    if (!detail) return null;
    const usage = detail.resource ? subscription?.limits?.[detail.resource] : undefined;
    return {
      ...detail,
      used: detail.used ?? usage?.used,
      limit: detail.limit ?? usage?.max,
      plan: detail.plan || subscription?.plan?.name,
    };
  }, [detail, subscription]);

  const close = () => setDetail(null);

  return (
    <Dialog
      visible={!!resolved}
      onHide={close}
      header={null}
      showHeader={false}
      dismissableMask
      style={{ width: '32rem', maxWidth: 'calc(100vw - 2rem)' }}
      contentStyle={{ padding: 0, borderRadius: '0.75rem' }}
    >
      {resolved && (
        <PlanLimitCard
          detail={resolved}
          actions={
            <>
              <Button
                label={t('planLimitChangePlan')}
                onClick={() => {
                  close();
                  navigate(SUBSCRIPTION_PATH);
                }}
              />
              <Button label={t('planLimitClose')} outlined onClick={close} />
            </>
          }
        />
      )}
    </Dialog>
  );
}
