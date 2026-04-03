import { useTenants } from '../hooks/useTenants';
import { SkeletonCard, SkeletonListItem } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  BarChart3,
  Activity,
  Shield,
  Archive,
  Layers,
} from 'lucide-react';

// ─── KPI hero card (Total Tenants) ───────────────────────────────────────────
interface KpiHeroProps {
  total: number;
  active: number;
  trial: number;
  expired: number;
  suspended: number;
  disabled: number;
  archived: number;
  loading?: boolean;
}

function KpiHeroCard({
  total,
  active,
  trial,
  expired,
  suspended,
  disabled,
  archived,
  loading,
}: KpiHeroProps) {
  if (loading)
    return (
      <div className="col-span-2 h-[200px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
    );

  const healthScore = total > 0 ? Math.round(((active + trial * 0.5) / total) * 100) : 0;
  const healthColor =
    healthScore >= 70
      ? 'text-emerald-600 dark:text-emerald-400'
      : healthScore >= 40
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-red-500 dark:text-red-400';
  const healthTrack =
    healthScore >= 70 ? 'bg-emerald-500' : healthScore >= 40 ? 'bg-amber-400' : 'bg-red-500';

  const segments = [
    { count: active, color: 'bg-emerald-500', label: 'Active' },
    { count: trial, color: 'bg-blue-400', label: 'Trial' },
    { count: expired, color: 'bg-orange-400', label: 'Expired' },
    { count: suspended, color: 'bg-red-400', label: 'Suspended' },
    { count: disabled + archived, color: 'bg-slate-300 dark:bg-slate-600', label: 'Inactive' },
  ].filter((s) => s.count > 0);

  return (
    <Link to="/tenants" className="group col-span-2 animate-fade-in">
      <div className="card relative h-full overflow-hidden p-5 transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* Top strip */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Total Tenants
              </span>
            </div>
            <p className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums leading-none mt-2">
              {total}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{active}</span>{' '}
              active ·{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">{trial}</span> on
              trial
            </p>
          </div>

          {/* Health score ring */}
          <div className="shrink-0 text-center">
            <p className={`text-2xl font-extrabold tabular-nums leading-none ${healthColor}`}>
              {healthScore}%
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Health
            </p>
          </div>
        </div>

        {/* Stacked bar */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              {segments.map((s) => (
                <div
                  key={s.label}
                  className={`h-full transition-all duration-700 ease-out ${s.color}`}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
                  <span className="text-[10px] text-slate-400">
                    {s.label}{' '}
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {s.count}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health bar */}
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Platform Health
            </span>
            <span className={`text-[11px] font-bold ${healthColor}`}>{healthScore}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${healthTrack}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── KPI feature card (Active / Trial / Needs Attention) ─────────────────────
interface KpiFeatureProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  accentClass: string; // top bar color
  iconBg: string;
  valueCls: string;
  sub?: string;
  linkTo?: string;
  loading?: boolean;
}

function KpiFeatureCard({
  label,
  value,
  total,
  icon,
  accentClass,
  iconBg,
  valueCls,
  sub,
  linkTo,
  loading,
}: KpiFeatureProps) {
  if (loading)
    return <div className="h-[140px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />;

  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  const inner = (
    <div className="card group relative h-full animate-fade-in overflow-hidden p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl ${accentClass}`} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums">{pct}%</span>
      </div>
      <p className={`text-3xl font-extrabold tracking-tight tabular-nums leading-none ${valueCls}`}>
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
        {label}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{sub}</p>
      )}
      {/* mini progress */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${accentClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );

  if (linkTo)
    return (
      <Link to={linkTo} className="h-full">
        {inner}
      </Link>
    );
  return inner;
}

// ─── KPI compact card (secondary metrics) ────────────────────────────────────
interface KpiCompactProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueCls: string;
  dotColor: string;
  sub?: string;
  linkTo?: string;
  loading?: boolean;
  urgent?: boolean;
}

function KpiCompactCard({
  label,
  value,
  icon,
  iconBg,
  valueCls,
  dotColor: _dotColor,
  sub,
  linkTo,
  loading,
  urgent,
}: KpiCompactProps) {
  if (loading)
    return <div className="h-[72px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />;

  const inner = (
    <div
      className={`group flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 animate-fade-in
            ${
              urgent && value > 0
                ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'
                : 'border-slate-200/80 bg-white dark:border-slate-700/40 dark:bg-slate-900/90'
            }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xl font-extrabold tabular-nums leading-none ${valueCls}`}>{value}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight truncate">
          {label}
        </p>
        {sub && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{sub}</p>
        )}
      </div>
      {urgent && value > 0 && (
        <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400">!</span>
        </div>
      )}
    </div>
  );

  if (linkTo) return <Link to={linkTo}>{inner}</Link>;
  return inner;
}

// ─── Plan distribution bar ───────────────────────────────────────────────────
function PlanBar({
  plan,
  count,
  total,
  color,
  dotColor,
}: {
  plan: string;
  count: number;
  total: number;
  color: string;
  dotColor: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const pctDisplay = Math.round(pct);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
            {plan}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {count}
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">({pctDisplay}%)</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({
  label,
  value,
  textClass,
  bgClass,
}: {
  label: string;
  value: number;
  textClass: string;
  bgClass: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl p-3 ${bgClass}`}>
      <span className={`text-xl font-extrabold tabular-nums leading-none ${textClass}`}>
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export function Dashboard() {
  const { data: allData, isLoading } = useTenants({ limit: 100 });
  const tenants = allData?.data ?? [];
  const total = allData?.total ?? 0;

  const byStatus = (s: string) => tenants.filter((t) => t.status === s).length;
  const active = byStatus('active');
  const trial = byStatus('trial');
  const expired = byStatus('expired');
  const suspended = byStatus('suspended');
  const disabled = byStatus('disabled');
  const archived = byStatus('archived');

  const byPlan = (p: string) => tenants.filter((t) => t.subscriptionPlan === p).length;

  const expiringSoon = tenants
    .filter((t) => t.status === 'trial' && (t.trialDaysRemaining ?? 99) <= 7)
    .sort((a, b) => (a.trialDaysRemaining ?? 0) - (b.trialDaysRemaining ?? 0));

  const recent = [...tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const healthScore = total > 0 ? Math.round(((active + trial * 0.5) / total) * 100) : 0;

  return (
    <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:space-y-8 animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
            <span>Morocom</span>
            <span>/</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isLoading
              ? 'Loading platform data…'
              : `${total} tenant${total !== 1 ? 's' : ''} · ${active} active · ${trial} on trial`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Link to="/tenants" className="btn-secondary">
            <Building2 className="h-4 w-4" />
            <span className="hidden xs:inline">All Tenants</span>
          </Link>
          <Link to="/tenants/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Tenant
          </Link>
        </div>
      </div>

      {/* ── Alert: expiring trials ──────────────────────────────── */}
      {!isLoading && expiringSoon.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 dark:border-amber-700/30 dark:from-amber-900/20 dark:to-orange-900/15 animate-fade-in">
          <div className="absolute right-0 top-0 h-full w-40 opacity-[0.06] bg-gradient-to-l from-amber-400 to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  {expiringSoon.length} trial{expiringSoon.length > 1 ? 's' : ''} expiring within 7
                  days
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {expiringSoon.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tenants/${t.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-all dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                    >
                      {t.name}
                      <span className="font-normal opacity-70">
                        · {t.trialDaysRemaining === 0 ? 'today' : `${t.trialDaysRemaining}d`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link
              to="/tenants?status=trial"
              className="shrink-0 self-start rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 active:scale-[0.97] transition-all shadow-sm"
            >
              View all →
            </Link>
          </div>
        </div>
      )}

      {/* ── KPI section ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Primary row: hero card (2 cols) + 2 feature cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
          <KpiHeroCard
            total={total}
            active={active}
            trial={trial}
            expired={expired}
            suspended={suspended}
            disabled={disabled}
            archived={archived}
            loading={isLoading}
          />
          <KpiFeatureCard
            label="Active Tenants"
            value={active}
            total={total}
            icon={<CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            accentClass="bg-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            valueCls="text-emerald-700 dark:text-emerald-300"
            linkTo="/tenants?status=active"
            loading={isLoading}
          />
          <KpiFeatureCard
            label="On Trial"
            value={trial}
            total={total}
            icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            accentClass="bg-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/30"
            valueCls="text-blue-700 dark:text-blue-300"
            sub={expiringSoon.length > 0 ? `${expiringSoon.length} expiring soon` : undefined}
            linkTo="/tenants?status=trial"
            loading={isLoading}
          />
        </div>

        {/* Secondary row: 4 compact status cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <KpiCompactCard
            label="Expired"
            value={expired}
            icon={<XCircle className="h-5 w-5 text-orange-500" />}
            iconBg="bg-orange-50 dark:bg-orange-900/30"
            valueCls="text-orange-600 dark:text-orange-400"
            dotColor="bg-orange-400"
            sub={expired > 0 ? 'Need renewal' : undefined}
            linkTo="/tenants?status=expired"
            loading={isLoading}
            urgent={expired > 0}
          />
          <KpiCompactCard
            label="Suspended"
            value={suspended}
            icon={<Shield className="h-5 w-5 text-red-500" />}
            iconBg="bg-red-50 dark:bg-red-900/30"
            valueCls="text-red-600 dark:text-red-400"
            dotColor="bg-red-400"
            sub={suspended > 0 ? 'Blocked access' : undefined}
            linkTo="/tenants?status=suspended"
            loading={isLoading}
            urgent={suspended > 0}
          />
          <KpiCompactCard
            label="Disabled"
            value={disabled}
            icon={<Archive className="h-5 w-5 text-slate-400" />}
            iconBg="bg-slate-100 dark:bg-slate-800"
            valueCls="text-slate-600 dark:text-slate-400"
            dotColor="bg-slate-300"
            loading={isLoading}
          />
          <KpiCompactCard
            label="Archived"
            value={archived}
            icon={<Archive className="h-5 w-5 text-slate-400" />}
            iconBg="bg-slate-100 dark:bg-slate-800"
            valueCls="text-slate-500 dark:text-slate-500"
            dotColor="bg-slate-200"
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── Second row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column: Plan distribution + Status + Health */}
        <div className="card p-5 space-y-6">
          {/* Plan distribution */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Plan Distribution
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="h-1.5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <PlanBar
                  plan="Enterprise"
                  count={byPlan('enterprise')}
                  total={total}
                  color="bg-violet-600"
                  dotColor="bg-violet-500"
                />
                <PlanBar
                  plan="Pro"
                  count={byPlan('pro')}
                  total={total}
                  color="bg-indigo-500"
                  dotColor="bg-indigo-500"
                />
                <PlanBar
                  plan="Basic"
                  count={byPlan('basic')}
                  total={total}
                  color="bg-blue-400"
                  dotColor="bg-blue-400"
                />
                <PlanBar
                  plan="Trial"
                  count={byPlan('trial')}
                  total={total}
                  color="bg-sky-400"
                  dotColor="bg-sky-400"
                />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Status breakdown */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Status Breakdown
            </p>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <StatusChip
                  label="Active"
                  value={active}
                  textClass="text-emerald-700 dark:text-emerald-400"
                  bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                />
                <StatusChip
                  label="Trial"
                  value={trial}
                  textClass="text-blue-700 dark:text-blue-400"
                  bgClass="bg-blue-50 dark:bg-blue-900/20"
                />
                <StatusChip
                  label="Expired"
                  value={expired}
                  textClass="text-orange-600 dark:text-orange-400"
                  bgClass="bg-orange-50 dark:bg-orange-900/20"
                />
                <StatusChip
                  label="Suspended"
                  value={suspended}
                  textClass="text-red-600 dark:text-red-400"
                  bgClass="bg-red-50 dark:bg-red-900/20"
                />
                <StatusChip
                  label="Disabled"
                  value={disabled}
                  textClass="text-slate-600 dark:text-slate-400"
                  bgClass="bg-slate-100 dark:bg-slate-800"
                />
                <StatusChip
                  label="Archived"
                  value={archived}
                  textClass="text-slate-500 dark:text-slate-500"
                  bgClass="bg-slate-100 dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          {/* Platform health */}
          {!isLoading && total > 0 && (
            <>
              <div className="border-t border-slate-100 dark:border-slate-800" />
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Platform Health
                  </p>
                  <span
                    className={`text-sm font-extrabold tabular-nums ${
                      healthScore >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : healthScore >= 40
                          ? 'text-amber-500'
                          : 'text-red-500'
                    }`}
                  >
                    {healthScore}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      healthScore >= 70
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : healthScore >= 40
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">
                  Active & trial tenants as % of total
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right column: Recently added */}
        <div className="card flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <Activity className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recently Added
              </h2>
            </div>
            <Link
              to="/tenants"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-all"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && recent.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No tenants yet</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Create your first tenant to get started
              </p>
              <Link to="/tenants/new" className="btn-primary mt-5">
                <Plus className="h-4 w-4" />
                Create Tenant
              </Link>
            </div>
          )}

          {/* List */}
          {!isLoading && recent.length > 0 && (
            <>
              <ul className="flex-1 divide-y divide-slate-100/80 dark:divide-slate-800/60">
                {recent.map((t, i) => (
                  <li
                    key={t.id}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="animate-fade-in"
                  >
                    <Link
                      to={`/tenants/${t.id}`}
                      className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm transition-shadow group-hover:shadow-md"
                        style={{ backgroundColor: t.primaryColor ?? '#6366f1' }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                          {t.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            /{t.slug}
                          </span>
                          <span className="hidden text-[10px] text-slate-300 dark:text-slate-700 sm:inline">
                            ·
                          </span>
                          <span className="hidden text-[11px] capitalize text-slate-400 sm:inline">
                            {t.subscriptionPlan}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex shrink-0 items-center gap-2.5">
                        <StatusBadge status={t.status} trialDaysRemaining={t.trialDaysRemaining} />
                        <span className="hidden text-[11px] text-slate-400 lg:block tabular-nums">
                          {new Date(t.createdAt).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors dark:text-slate-700" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Footer CTA */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
                <Link
                  to="/tenants/new"
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Tenant
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
