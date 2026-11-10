import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import {
  CreditCard,
  CalendarClock,
  Activity,
  CheckCircle2,
  XCircle,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '@orderium/ui';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid, type KpiColor } from '../components/KpiCard';
import { EmptyState } from '../components/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';
import { companyService } from '../modules/company/company.service';
import {
  subscriptionService,
  PLAN_DISPLAY_NAMES,
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_RESOURCES,
  type SubscriptionPlanName,
  type SubscriptionResource,
  type SubscriptionUsage,
} from '../modules/subscription';

/** Plans that can be requested from the page, in upgrade order (trial is not sold). */
const SELLABLE_PLANS: SubscriptionPlanName[] = ['starter', 'business', 'pro', 'enterprise'];

const STATUS_COLORS: Record<string, KpiColor> = {
  trial: 'blue',
  active: 'emerald',
  expired: 'red',
  suspended: 'orange',
  disabled: 'red',
};

/** Next plan up from the current one (the previous one for Entreprise) — the default choice. */
function defaultWantedPlan(current: string): SubscriptionPlanName {
  const idx = SELLABLE_PLANS.indexOf(current as SubscriptionPlanName);
  if (idx === -1) return 'business'; // trial or unknown plan
  return idx < SELLABLE_PLANS.length - 1 ? SELLABLE_PLANS[idx + 1] : SELLABLE_PLANS[idx - 1];
}

/** Tenant slug from the subdomain (acme-admin.marnova.ma → acme) — last-resort name. */
function tenantSlugFromHost(): string {
  const match = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
  return match ? match[1].replace(/-(admin|app|delivery)$/i, '') : window.location.hostname;
}

export default function SubscriptionPage() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const numberLocale = isRTL ? 'ar-MA' : 'fr-FR';

  const {
    data: subscription,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => subscriptionService.getCurrent(),
    staleTime: 60_000,
  });

  // Company name for the WhatsApp request — shares the CompanySettings cache.
  const { data: company } = useQuery({
    queryKey: ['company', 'info'],
    queryFn: () => companyService.getCompanyInfo(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const currentPlan = subscription?.plan?.name ?? '';
  const [wantedPlan, setWantedPlan] = useState<SubscriptionPlanName | null>(null);
  useEffect(() => {
    if (currentPlan && !wantedPlan) setWantedPlan(defaultWantedPlan(currentPlan));
  }, [currentPlan, wantedPlan]);

  const fmtNumber = useMemo(() => new Intl.NumberFormat(numberLocale), [numberLocale]);

  const formatAmount = (resource: SubscriptionResource, value: number): string => {
    if (resource !== 'storageMb') return fmtNumber.format(value);
    if (value >= 1024) {
      const gb = Math.round((value / 1024) * 10) / 10;
      return `${fmtNumber.format(gb)} ${t('subscriptionUnitGb')}`;
    }
    return `${fmtNumber.format(Math.round(value))} ${t('subscriptionUnitMb')}`;
  };

  const planName = subscriptionService.planDisplayName(currentPlan);
  const statusKey = `subscriptionStatus_${subscription?.status ?? ''}` as TranslationKey;
  const statusLabel = t(statusKey) === statusKey ? (subscription?.status ?? '') : t(statusKey);
  const isTrial = subscription?.status === 'trial' || currentPlan === 'trial';
  const endDate = isTrial ? subscription?.trialEndsAt : subscription?.subscriptionEndsAt;

  const openWhatsApp = () => {
    if (!wantedPlan) return;
    const tenant = company?.companyName?.trim() || tenantSlugFromHost();
    const message = t('subscriptionWhatsAppMessage')
      .replace('{tenant}', tenant)
      .replace('{current}', planName || '—')
      .replace('{wanted}', PLAN_DISPLAY_NAMES[wantedPlan]);
    window.open(subscriptionService.upgradeWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  };

  const changePlanButton = (
    <Button
      label={t('subscriptionChangePlan')}
      icon={<MessageCircle style={{ width: 16, height: 16 }} />}
      onClick={openWhatsApp}
      disabled={!wantedPlan}
    />
  );

  const card: React.CSSProperties = {
    background: 'var(--surface-card, #fff)',
    border: '1px solid var(--surface-border, #e2e8f0)',
    borderRadius: '0.875rem',
    padding: '1.25rem',
  };
  const cardTitle: React.CSSProperties = {
    margin: '0 0 1rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-color, #0f172a)',
  };

  return (
    <AdminLayout>
      <div className="sub-page" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <style>{`
          .sub-page { max-width: 1100px; margin: 0 auto; width: 100%; }
          .sub-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem; }
          @media (min-width: 900px) { .sub-grid { grid-template-columns: 1fr 1.4fr; } }
          .sub-feature { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
            padding: 0.75rem 0; border-bottom: 1px solid var(--surface-border, #eef2f7); }
          .sub-feature:last-child { border-bottom: none; padding-bottom: 0; }
          .sub-feature:first-child { padding-top: 0; }
          .sub-pill { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1875rem 0.625rem;
            border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
          .sub-pill--on { background: #ecfdf5; color: #047857; }
          .sub-pill--off { background: #f1f5f9; color: #64748b; }
          .sub-limit { padding: 0.75rem 0; border-bottom: 1px solid var(--surface-border, #eef2f7); }
          .sub-limit:last-child { border-bottom: none; padding-bottom: 0; }
          .sub-limit:first-child { padding-top: 0; }
          .sub-limit__row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem;
            font-size: 0.875rem; }
          .sub-limit__label { font-weight: 600; color: var(--text-color, #0f172a); }
          .sub-limit__value { color: #475569; font-variant-numeric: tabular-nums; white-space: nowrap; }
          .sub-bar { height: 0.5rem; border-radius: 999px; background: #eef2f7; overflow: hidden; margin-top: 0.5rem; }
          .sub-bar__fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
          .sub-limit__hint { margin-top: 0.375rem; font-size: 0.75rem; font-weight: 600; }
          .sub-plans { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 1rem; }
          .sub-plan-chip { padding: 0.5rem 0.875rem; border-radius: 0.625rem; border: 1px solid var(--surface-border, #e2e8f0);
            background: transparent; font: inherit; font-size: 0.875rem; font-weight: 600; cursor: pointer;
            color: var(--text-color, #0f172a); min-height: 2.5rem; }
          .sub-plan-chip[aria-pressed='true'] { border-color: var(--primary-color, #235ae4);
            background: rgba(35,90,228,0.08); color: var(--primary-color, #235ae4); }
          .sub-plan-chip:disabled { opacity: 0.45; cursor: default; }
          /* Full-width call-to-action on phones */
          @media (max-width: 639px) { .sub-cta .p-button { width: 100%; justify-content: center; } }
        `}</style>

        <PageHeader
          icon={CreditCard}
          title={t('mySubscription')}
          subtitle={t('subscriptionSubtitle')}
          actions={subscription ? changePlanButton : undefined}
        />

        {isError ? (
          <div style={card}>
            <EmptyState
              icon={XCircle}
              title={t('subscriptionLoadError')}
              action={
                <Button
                  label={t('subscriptionRetry')}
                  icon={<RefreshCw style={{ width: 16, height: 16 }} />}
                  outlined
                  loading={isFetching}
                  onClick={() => refetch()}
                />
              }
            />
          </div>
        ) : (
          <>
            <KpiGrid count={3}>
              <KpiCard
                label={t('subscriptionCurrentPlan')}
                value={planName || '—'}
                icon={CreditCard}
                color="indigo"
                loading={isLoading}
              />
              <KpiCard
                label={t('subscriptionStatus')}
                value={statusLabel || '—'}
                icon={Activity}
                color={STATUS_COLORS[subscription?.status ?? ''] ?? 'blue'}
                loading={isLoading}
              />
              <KpiCard
                label={isTrial ? t('subscriptionTrialEndsOn') : t('subscriptionRenewsOn')}
                value={endDate ? formatDate(endDate) : t('subscriptionNoEndDate')}
                icon={CalendarClock}
                color="amber"
                loading={isLoading}
              />
            </KpiGrid>

            <div className="sub-grid">
              {/* ── Features ── */}
              <section style={card}>
                <h2 style={cardTitle}>{t('subscriptionFeatures')}</h2>
                {SUBSCRIPTION_FEATURES.map((feature) => {
                  const included = subscription?.features?.[feature] === true;
                  return (
                    <div key={feature} className="sub-feature">
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-color, #0f172a)' }}>
                        {t(`subscriptionFeature_${feature}` as TranslationKey)}
                      </span>
                      {!isLoading && (
                        <span className={`sub-pill ${included ? 'sub-pill--on' : 'sub-pill--off'}`}>
                          {included ? (
                            <CheckCircle2 size={14} aria-hidden />
                          ) : (
                            <XCircle size={14} aria-hidden />
                          )}
                          {included ? t('subscriptionIncluded') : t('subscriptionNotIncluded')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </section>

              {/* ── Usage ── */}
              <section style={card}>
                <h2 style={cardTitle}>{t('subscriptionUsage')}</h2>
                {SUBSCRIPTION_RESOURCES.map((resource) => (
                  <UsageRow
                    key={resource}
                    label={t(`subscriptionLimit_${resource}` as TranslationKey)}
                    usage={subscription?.limits?.[resource]}
                    loading={isLoading}
                    format={(v) => formatAmount(resource, v)}
                    t={t}
                  />
                ))}
              </section>
            </div>

            {/* ── Change plan ── */}
            {subscription && (
              <section style={{ ...card, marginTop: '1rem' }}>
                <h2 style={{ ...cardTitle, marginBottom: '0.375rem' }}>
                  {t('subscriptionChangePlan')}
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {t('subscriptionChangePlanHint')}
                </p>
                <div className="sub-plans" role="group" aria-label={t('subscriptionWantedPlan')}>
                  {SELLABLE_PLANS.map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      className="sub-plan-chip"
                      aria-pressed={wantedPlan === plan}
                      disabled={plan === currentPlan}
                      onClick={() => setWantedPlan(plan)}
                    >
                      {PLAN_DISPLAY_NAMES[plan]}
                    </button>
                  ))}
                </div>
                <div className="sub-cta">{changePlanButton}</div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

interface UsageRowProps {
  label: string;
  usage: SubscriptionUsage | undefined;
  loading: boolean;
  format: (value: number) => string;
  t: (key: TranslationKey) => string;
}

function UsageRow({ label, usage, loading, format, t }: UsageRowProps) {
  const used = usage?.used ?? 0;
  const max = usage?.max;

  let valueText = '—';
  // "used / max" must read left-to-right even in Arabic, or 9 / 15 shows as 15 / 9.
  let numeric = false;
  let percent = 0;
  let barColor = 'var(--primary-color, #235ae4)';
  let hint: { text: string; color: string } | null = null;

  if (!loading && usage) {
    if (max === -1) {
      valueText = `${format(used)} · ${t('subscriptionUnlimited')}`;
    } else if (max === 0) {
      valueText = t('subscriptionNotIncluded');
    } else if (max !== undefined) {
      valueText = `${format(used)} / ${format(max)}`;
      numeric = true;
      percent = Math.min(100, (used / max) * 100);
      if (percent >= 100) {
        barColor = '#dc2626';
        hint = { text: t('subscriptionLimitReached'), color: '#dc2626' };
      } else if (percent >= 80) {
        barColor = '#f59e0b';
        hint = { text: t('subscriptionLimitNear'), color: '#b45309' };
      }
    }
  }

  const showBar = !loading && usage && max !== undefined && max > 0;

  return (
    <div className="sub-limit">
      <div className="sub-limit__row">
        <span className="sub-limit__label">{label}</span>
        <span className="sub-limit__value" dir={numeric ? 'ltr' : undefined}>
          {valueText}
        </span>
      </div>
      {showBar && (
        <div
          className="sub-bar"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div className="sub-bar__fill" style={{ width: `${percent}%`, background: barColor }} />
        </div>
      )}
      {hint && (
        <div className="sub-limit__hint" style={{ color: hint.color }}>
          {hint.text}
        </div>
      )}
    </div>
  );
}
