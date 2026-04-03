import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  X,
  RefreshCw,
  CreditCard,
  Activity,
  Shield,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Zap,
  Ban,
  PlayCircle,
  Database,
  Users,
  ShoppingCart,
  HardDrive,
  Globe,
  Mail,
  Phone,
  MapPin,
  StickyNote,
  Server,
  Layers,
  TrendingUp,
  Package,
  LayoutGrid,
  Smartphone,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useTenant,
  useTenantStats,
  useUpdateTenant,
  useActivateTenant,
  useDisableTenant,
  useDeleteTenant,
  useResetTenant,
  useSuspendTenant,
  useArchiveTenant,
  useUnarchiveTenant,
  useExtendTrial,
  useTenantActivity,
  useTenantPayments,
  useValidatePayment,
  useRejectPayment,
  useRefundPayment,
  useTenantModules,
  useUpdateTenantModules,
} from '../hooks/useTenants';
import { StatusBadge } from '../components/StatusBadge';
import { CopyableUrl } from '../components/CopyableUrl';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TenantForm } from '../components/TenantForm';
import type { UpdateTenantInput, Payment, TenantModulesConfig } from '../types/tenant';
import { DEFAULT_MODULES } from '../types/tenant';

type Tab = 'overview' | 'subscription' | 'payments' | 'activity' | 'modules' | 'danger';

// ─────────────────────────────── helpers ─────────────────────────────────────

function trialDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'MAD') {
  return `${amount.toLocaleString()} ${currency}`;
}

// ───────────────────────── sub-components ────────────────────────────────────

function UsageMeter({
  label,
  used,
  max,
  icon,
}: {
  label: string;
  used: number;
  max: number;
  icon?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500';
  const trackColor =
    pct >= 90
      ? 'bg-red-50 dark:bg-red-950/30'
      : pct >= 70
        ? 'bg-amber-50 dark:bg-amber-950/30'
        : 'bg-indigo-50 dark:bg-indigo-950/30';
  const labelColor =
    pct >= 90
      ? 'text-red-600 dark:text-red-400'
      : pct >= 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className={`${labelColor}`}>{icon}</span>}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${labelColor}`}>{pct}%</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {used.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${trackColor}`}>
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  const cfg: Record<Payment['status'], { cls: string; dot: string }> = {
    pending: {
      cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
      dot: 'bg-amber-400',
    },
    validated: {
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    rejected: {
      cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400',
      dot: 'bg-red-500',
    },
    refunded: {
      cls: 'bg-slate-100 text-slate-600 ring-slate-400/10 dark:bg-slate-800 dark:text-slate-400',
      dot: 'bg-slate-400',
    },
  };
  const { cls, dot } = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InlineModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 dark:border-slate-800">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────── main page ───────────────────────────────────

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const navigate = useNavigate();

  const { data: tenant, isLoading, error } = useTenant(tenantId);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTenantStats(tenantId);
  const { data: activityData } = useTenantActivity(tenantId);
  const { data: paymentsData } = useTenantPayments(tenantId);
  const { data: modulesData } = useTenantModules(tenantId);
  const updateModulesMutation = useUpdateTenantModules(tenantId);

  const updateMutation = useUpdateTenant(tenantId);
  const activate = useActivateTenant();
  const disable = useDisableTenant();
  const softDelete = useDeleteTenant();
  const reset = useResetTenant();
  const suspend = useSuspendTenant();
  const archive = useArchiveTenant();
  const unarchive = useUnarchiveTenant();
  const extendTrial = useExtendTrial();
  const validatePayment = useValidatePayment();
  const rejectPayment = useRejectPayment();
  const refundPayment = useRefundPayment();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editMode, setEditMode] = useState(false);
  const [dialog, setDialog] = useState<
    'activate' | 'disable' | 'suspend' | 'archive' | 'unarchive' | 'delete' | 'reset' | null
  >(null);
  const [confirmText, setConfirmText] = useState('');
  const [extendDays, setExtendDays] = useState(14);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [draftModules, setDraftModules] = useState<TenantModulesConfig>(DEFAULT_MODULES);

  // Sync draft when server data arrives
  useEffect(() => {
    if (modulesData) setDraftModules(modulesData);
  }, [modulesData]);

  const handleSaveModules = async () => {
    try {
      await updateModulesMutation.mutateAsync(draftModules);
      toast.success('Module configuration saved');
    } catch {
      toast.error('Failed to save module configuration');
    }
  };

  const daysLeft = useMemo(
    () => (tenant ? trialDaysRemaining(tenant.trialEndsAt) : null),
    [tenant],
  );

  const handleUpdate = async (data: UpdateTenantInput) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Tenant updated');
      setEditMode(false);
    } catch {
      toast.error('Failed to update tenant');
    }
  };

  const handleConfirm = async () => {
    if (!tenant) return;
    try {
      switch (dialog) {
        case 'activate':
          await activate.mutateAsync({ id: tenantId });
          toast.success('Tenant activated');
          break;
        case 'disable':
          await disable.mutateAsync({ id: tenantId, reason: confirmText || 'Disabled by admin' });
          toast.success('Tenant disabled');
          break;
        case 'suspend':
          await suspend.mutateAsync({ id: tenantId, reason: confirmText || 'Suspended by admin' });
          toast.success('Tenant suspended');
          break;
        case 'archive':
          if (confirmText !== tenant.name) return;
          await archive.mutateAsync({ id: tenantId, confirmation: confirmText });
          toast.success('Tenant archived');
          break;
        case 'unarchive':
          await unarchive.mutateAsync(tenantId);
          toast.success('Tenant restored');
          break;
        case 'delete':
          if (confirmText !== `DELETE ${tenant.name}`) return;
          await softDelete.mutateAsync({ id: tenantId, confirmation: confirmText });
          toast.success('Tenant deleted');
          navigate('/tenants');
          break;
        case 'reset':
          if (confirmText !== 'RESET') return;
          await reset.mutateAsync({ id: tenantId, confirmation: 'RESET' });
          toast.success('Tenant data reset');
          refetchStats();
          break;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Operation failed';
      toast.error(msg);
    } finally {
      setDialog(null);
      setConfirmText('');
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setConfirmText('');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading tenant…</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tenant not found
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            This tenant may have been deleted or the ID is invalid.
          </p>
        </div>
        <button onClick={() => navigate('/tenants')} className="btn-secondary text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to tenants
        </button>
      </div>
    );
  }

  const urls = {
    admin: `https://${tenant.slug}-admin.mar-nova.com`,
    client: `https://${tenant.slug}-app.mar-nova.com`,
    delivery: `https://${tenant.slug}-delivery.mar-nova.com`,
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Layers className="h-4 w-4" /> },
    { key: 'subscription', label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'payments', label: 'Payments', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
    { key: 'modules', label: 'Modules', icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  const isLocked = tenant.status === 'archived' || tenant.status === 'deleted';
  const canActivate = ['disabled', 'suspended', 'expired'].includes(tenant.status);
  const canDisable = ['active', 'trial'].includes(tenant.status);

  const PLAN_META: Record<string, { gradient: string; badge: string; label: string }> = {
    trial: {
      gradient: 'from-slate-400 to-slate-500',
      badge: 'bg-slate-100 text-slate-600 ring-slate-400/20 dark:bg-slate-800 dark:text-slate-300',
      label: 'Trial',
    },
    basic: {
      gradient: 'from-indigo-400 to-indigo-600',
      badge:
        'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/40 dark:text-indigo-300',
      label: 'Basic',
    },
    pro: {
      gradient: 'from-violet-500 to-purple-600',
      badge:
        'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-900/40 dark:text-violet-300',
      label: 'Pro',
    },
    enterprise: {
      gradient: 'from-rose-500 to-pink-600',
      badge: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-300',
      label: 'Enterprise',
    },
  };
  const planMeta = PLAN_META[tenant.subscriptionPlan?.toLowerCase()] ?? PLAN_META.basic;
  const accentColor = tenant.primaryColor ?? '#6366f1';

  return (
    <div className="animate-fade-in">
      {/* ══════════ HERO HEADER ══════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/40 dark:bg-slate-900/90 mb-6 mx-6 mt-6 lg:mx-8 lg:mt-8">
        {/* Decorative backdrop */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${accentColor} 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${accentColor} 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, ${accentColor}40, ${accentColor}, ${accentColor}40)`,
          }}
        />

        <div className="relative p-6 lg:p-8">
          {/* Back link */}
          <button
            onClick={() => navigate('/tenants')}
            className="mb-5 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </button>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: identity */}
            <div className="flex items-center gap-5">
              <div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                {tenant.name.charAt(0).toUpperCase()}
                {tenant.status === 'active' && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {tenant.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {tenant.slug}
                  </code>
                  <StatusBadge status={tenant.status} trialDaysRemaining={daysLeft} />
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${planMeta.badge}`}
                  >
                    {planMeta.label}
                  </span>
                </div>
                {tenant.contactEmail && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Mail className="h-3 w-3" />
                    {tenant.contactEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Right: actions */}
            {!isLocked && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canActivate && (
                  <button
                    onClick={() => setDialog('activate')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Activate
                  </button>
                )}
                {canDisable && (
                  <button
                    onClick={() => setDialog('disable')}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                  >
                    <Ban className="h-4 w-4" />
                    Disable
                  </button>
                )}
                <button onClick={() => setEditMode((e) => !e)} className="btn-secondary">
                  {editMode ? (
                    <>
                      <X className="h-4 w-4" /> Cancel
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4" /> Edit
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Quick stats strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-4">
            {[
              {
                icon: <Users className="h-4 w-4" />,
                label: 'Users',
                value: statsLoading ? '—' : (stats?.usersCount ?? '—').toLocaleString(),
                color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400',
              },
              {
                icon: <ShoppingCart className="h-4 w-4" />,
                label: 'Orders',
                value: statsLoading ? '—' : (stats?.ordersCount ?? '—').toLocaleString(),
                color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400',
              },
              {
                icon: <Database className="h-4 w-4" />,
                label: 'DB Size',
                value: statsLoading ? '—' : (stats?.dbSizeHuman ?? '—'),
                color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400',
              },
              {
                icon: <HardDrive className="h-4 w-4" />,
                label: 'Storage',
                value: statsLoading ? '—' : (stats?.storageUsedHuman ?? '—'),
                color:
                  'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
              },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 pb-8 lg:px-8">
        {/* ── Edit Form ── */}
        {editMode && (
          <div className="card animate-fade-in p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Edit Tenant
              </h2>
              <button
                onClick={() => setEditMode(false)}
                className="btn-ghost text-xs py-1.5 px-2.5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
            <TenantForm
              onSubmit={handleUpdate}
              loading={updateMutation.isPending}
              initial={tenant}
              editMode
            />
          </div>
        )}

        {/* ── Trial Expiry Banner ── */}
        {tenant.status === 'trial' && daysLeft !== null && daysLeft <= 3 && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Trial{' '}
                {daysLeft === 0
                  ? 'ends today!'
                  : `expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`}
              </p>
              <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-500">
                Go to the Subscription tab to extend the trial or activate this tenant.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('subscription')}
              className="shrink-0 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Manage
            </button>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="card p-1.5">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150',
                    active && !isDanger
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : active && isDanger
                        ? 'bg-red-600 text-white shadow-sm'
                        : isDanger
                          ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  ].join(' ')}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
            <div className="ml-auto flex items-center">
              <button
                onClick={() => refetchStats()}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Refresh live stats"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </nav>
        </div>

        {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Contact Information */}
              <div className="card p-6">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Contact Information
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Primary contact details for this tenant.
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <InfoRow
                    icon={<Users className="h-4 w-4" />}
                    label="Contact Name"
                    value={tenant.contactName ?? <span className="text-slate-400">—</span>}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={
                      tenant.contactEmail ? (
                        <a
                          href={`mailto:${tenant.contactEmail}`}
                          className="text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {tenant.contactEmail}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )
                    }
                  />
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={tenant.contactPhone ?? <span className="text-slate-400">—</span>}
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={tenant.address ?? <span className="text-slate-400">—</span>}
                  />
                  {tenant.notes && (
                    <InfoRow
                      icon={<StickyNote className="h-4 w-4" />}
                      label="Notes"
                      value={
                        <span className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                          {tenant.notes}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>

              {/* Technical Details */}
              <div className="card p-6">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Server className="h-4 w-4 text-indigo-500" />
                  Technical Details
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Infrastructure and lifecycle metadata.
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <InfoRow
                    icon={<Database className="h-4 w-4" />}
                    label="Database"
                    value={
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {tenant.databaseName}
                      </code>
                    }
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Created"
                    value={formatDate(tenant.createdAt)}
                  />
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Last Status Change"
                    value={formatDate(tenant.statusChangedAt)}
                  />
                  {tenant.statusReason && (
                    <InfoRow
                      icon={<AlertTriangle className="h-4 w-4" />}
                      label="Status Reason"
                      value={
                        <span className="text-amber-600 dark:text-amber-400">
                          {tenant.statusReason}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Portal URLs */}
              <div className="card p-6">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  Portal URLs
                </h2>
                <p className="mb-4 text-xs text-slate-400">Click to open, or copy to clipboard.</p>
                <div className="space-y-2.5">
                  {[
                    {
                      key: 'admin',
                      label: 'Admin',
                      url: urls.admin,
                      icon: <Shield className="h-3 w-3" />,
                    },
                    {
                      key: 'client',
                      label: 'Client',
                      url: urls.client,
                      icon: <Users className="h-3 w-3" />,
                    },
                    {
                      key: 'delivery',
                      label: 'Delivery',
                      url: urls.delivery,
                      icon: <Package className="h-3 w-3" />,
                    },
                  ].map(({ key, label, url }) => (
                    <CopyableUrl key={key} label={label} value={url} href={url} />
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Zap className="h-4 w-4 text-indigo-500" />
                  Branding
                </h2>
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div>
                    <p className="text-xs text-slate-400">Primary Color</p>
                    <code className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                      {accentColor}
                    </code>
                  </div>
                </div>
                {tenant.logoUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <img
                      src={tenant.logoUrl}
                      alt="Logo"
                      className="h-16 w-full object-contain p-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ SUBSCRIPTION TAB ══════════════════ */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Plan card */}
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${planMeta.gradient} p-6 text-white shadow-lg`}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)',
                }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/70">Current Plan</p>
                  <h3 className="mt-0.5 text-3xl font-extrabold capitalize tracking-tight">
                    {planMeta.label}
                  </h3>
                  <p className="mt-2 text-sm text-white/80">
                    {formatDate(tenant.subscriptionStartedAt)} →{' '}
                    {formatDate(tenant.subscriptionEndsAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm ${tenant.autoRenew ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}
                  >
                    {tenant.autoRenew ? '↻ Auto-renew on' : 'Auto-renew off'}
                  </span>
                </div>
              </div>
              <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-5 sm:grid-cols-4">
                {[
                  { label: 'Max Users', value: tenant.maxUsers.toLocaleString() },
                  { label: 'Max Products', value: tenant.maxProducts.toLocaleString() },
                  { label: 'Orders/month', value: tenant.maxOrdersPerMonth.toLocaleString() },
                  { label: 'Storage', value: `${tenant.maxStorageMb.toLocaleString()} MB` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-white/60">{label}</p>
                    <p className="mt-0.5 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trial info */}
            {tenant.status === 'trial' && (
              <div className="card overflow-hidden p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${daysLeft !== null && daysLeft <= 3 ? 'bg-red-50 dark:bg-red-900/30' : daysLeft !== null && daysLeft <= 7 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}
                    >
                      <Clock
                        className={`h-5 w-5 ${daysLeft !== null && daysLeft <= 3 ? 'text-red-500' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-500' : 'text-blue-500'}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Trial Period
                      </h3>
                      <p className="text-xs text-slate-400">
                        {formatDate(tenant.trialStartedAt)} → {formatDate(tenant.trialEndsAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${daysLeft === 0 ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-red-600' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}`}
                    >
                      {daysLeft === null
                        ? '—'
                        : daysLeft === 0
                          ? 'Ends today!'
                          : `${daysLeft}d left`}
                    </p>
                    {tenant.trialDays > 0 && daysLeft !== null && (
                      <p className="text-xs text-slate-400">
                        {Math.round((daysLeft / tenant.trialDays) * 100)}% remaining
                      </p>
                    )}
                  </div>
                </div>

                {tenant.trialDays > 0 && daysLeft !== null && (
                  <div className="mt-4">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ease-out ${daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.round((daysLeft / tenant.trialDays) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Extend by:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="input w-20"
                  />
                  <span className="text-sm text-slate-500">days</span>
                  <button
                    onClick={async () => {
                      try {
                        await extendTrial.mutateAsync({ id: tenantId, additionalDays: extendDays });
                        toast.success(`Trial extended by ${extendDays} days`);
                      } catch {
                        toast.error('Failed to extend trial');
                      }
                    }}
                    disabled={extendTrial.isPending}
                    className="btn-primary py-2"
                  >
                    {extendTrial.isPending ? 'Extending…' : 'Extend Trial'}
                  </button>
                </div>
              </div>
            )}

            {/* Usage meters */}
            <div className="card p-6">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Shield className="h-4 w-4 text-indigo-500" />
                Plan Usage
              </h3>
              <p className="mb-5 text-xs text-slate-400">Live usage vs. plan limits.</p>
              <div className="space-y-5">
                <UsageMeter
                  label="Users"
                  used={stats?.usersCount ?? 0}
                  max={tenant.maxUsers}
                  icon={<Users className="h-4 w-4" />}
                />
                <UsageMeter
                  label="Orders / month"
                  used={stats?.ordersCount ?? 0}
                  max={tenant.maxOrdersPerMonth}
                  icon={<ShoppingCart className="h-4 w-4" />}
                />
                <UsageMeter
                  label="Storage (MB)"
                  used={stats ? Math.round(stats.storageUsedBytes / (1024 * 1024)) : 0}
                  max={tenant.maxStorageMb}
                  icon={<HardDrive className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ PAYMENTS TAB ══════════════════ */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Payment History
                </h2>
                <p className="text-xs text-slate-400">
                  {paymentsData?.length ?? 0} record{(paymentsData?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => toast('Payment recording coming soon')}
                className="btn-primary py-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Record Payment
              </button>
            </div>

            {!paymentsData || paymentsData.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <CreditCard className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No payments yet
                  </p>
                  <p className="text-xs text-slate-400">
                    Payments recorded for this tenant will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentsData.map((p: Payment) => (
                  <div key={p.id} className="card overflow-hidden">
                    <button
                      className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => setExpandedPayment(expandedPayment === p.id ? null : p.id)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
                            {p.planName}
                          </span>
                          <span className="text-xs text-slate-400">({p.billingCycle})</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(p.createdAt)} · {formatDate(p.periodStart)} →{' '}
                          {formatDate(p.periodEnd)}
                          {p.paymentMethod && (
                            <>
                              {' '}
                              ·{' '}
                              <span className="capitalize">
                                {p.paymentMethod.replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.amount, p.currency)}
                        </p>
                      </div>
                      {expandedPayment === p.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {expandedPayment === p.id && (
                      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="flex flex-wrap items-center gap-3">
                          {p.referenceNumber && (
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                              <span className="text-xs text-slate-400">Ref: </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {p.referenceNumber}
                              </span>
                            </div>
                          )}
                          {p.notes && <p className="text-xs italic text-slate-500">{p.notes}</p>}
                          {p.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  validatePayment
                                    .mutateAsync({ paymentId: p.id, tenantId })
                                    .then(() => toast.success('Payment validated'))
                                    .catch(() => toast.error('Failed'))
                                }
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Validate
                              </button>
                              <button
                                onClick={() => setRejectPaymentId(p.id)}
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-transparent dark:hover:bg-red-900/20"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}
                          {p.status === 'validated' && (
                            <button
                              onClick={() =>
                                refundPayment
                                  .mutateAsync({ paymentId: p.id, tenantId })
                                  .then(() => toast.success('Payment refunded'))
                                  .catch(() => toast.error('Failed'))
                              }
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Refund
                            </button>
                          )}
                          {rejectPaymentId === p.id && (
                            <div className="flex items-center gap-2">
                              <input
                                placeholder="Rejection reason…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="input w-52 py-1.5 text-xs"
                              />
                              <button
                                onClick={() =>
                                  rejectPayment
                                    .mutateAsync({
                                      paymentId: p.id,
                                      tenantId,
                                      reason: rejectReason,
                                    })
                                    .then(() => {
                                      toast.success('Rejected');
                                      setRejectPaymentId(null);
                                      setRejectReason('');
                                    })
                                    .catch(() => toast.error('Failed'))
                                }
                                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setRejectPaymentId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ ACTIVITY TAB ══════════════════ */}
        {activeTab === 'activity' && (
          <div>
            {!activityData || activityData.length === 0 ? (
              <div className="card flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <Activity className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No activity yet
                  </p>
                  <p className="text-xs text-slate-400">
                    Actions on this tenant will be logged here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative pl-9">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700" />
                <div className="space-y-3">
                  {activityData.map((entry) => {
                    const isDestructive =
                      entry.action.includes('delete') ||
                      entry.action.includes('suspend') ||
                      entry.action.includes('reset');
                    const isPositive =
                      entry.action.includes('activat') || entry.action.includes('unarchive');
                    const isWarning =
                      entry.action.includes('disable') || entry.action.includes('archive');
                    const dotColor = isDestructive
                      ? 'bg-red-500 ring-red-100 dark:ring-red-900/40'
                      : isPositive
                        ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40'
                        : isWarning
                          ? 'bg-amber-500 ring-amber-100 dark:ring-amber-900/40'
                          : 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-900/40';
                    const labelColor = isDestructive
                      ? 'text-red-600 dark:text-red-400'
                      : isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-indigo-600 dark:text-indigo-400';

                    return (
                      <div key={entry.id} className="relative">
                        <div
                          className={`absolute -left-5 top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#080d1a] ${dotColor}`}
                        />
                        <div className="card p-4 transition-shadow hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className={`text-sm font-semibold capitalize ${labelColor}`}>
                                {entry.action.replace(/_/g, ' ')}
                              </span>
                              {entry.performedBy && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  by{' '}
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    {entry.performedBy}
                                  </span>
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-400 dark:bg-slate-800">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ MODULES TAB ══════════════════ */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            {/* Portal Access */}
            <div className="card p-6">
              <div className="mb-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  Portal Access
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Control whether customers and delivery personnel can log in to their portals.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      key: 'clientPortal' as const,
                      label: 'Client App',
                      description: 'Customer-facing portal for order tracking and browsing.',
                      icon: <Smartphone className="h-5 w-5" />,
                      color:
                        'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30',
                    },
                    {
                      key: 'deliveryPortal' as const,
                      label: 'Delivery Portal',
                      description: 'Delivery drivers portal for managing assigned deliveries.',
                      icon: <Truck className="h-5 w-5" />,
                      color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30',
                    },
                  ] as const
                ).map(({ key, label, description, icon, color }) => {
                  const enabled = draftModules.portals[key];
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setDraftModules((prev) => ({
                          ...prev,
                          portals: { ...prev.portals, [key]: !prev.portals[key] },
                        }))
                      }
                      className={[
                        'group relative flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-150',
                        enabled
                          ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-900/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600',
                      ].join(' ')}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {label}
                          </p>
                          {/* Toggle pill */}
                          <span
                            className={[
                              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
                              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                                enabled ? 'translate-x-4' : 'translate-x-0.5',
                              ].join(' ')}
                            />
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
                        <p
                          className={`mt-1.5 text-xs font-semibold ${enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                        >
                          {enabled ? 'Access enabled' : 'Access disabled'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Module toggles by category */}
            {[
              {
                title: 'Operations',
                description: 'Core order and point-of-sale features.',
                modules: [
                  {
                    key: 'commandes' as const,
                    label: 'Commandes',
                    description: 'Order management',
                  },
                  { key: 'pos' as const, label: 'POS', description: 'Point of sale' },
                  { key: 'caisse' as const, label: 'Caisse', description: 'Cash register' },
                ],
              },
              {
                title: 'Documents',
                description: 'Outbound commercial documents.',
                modules: [
                  { key: 'devis' as const, label: 'Devis', description: 'Quotes' },
                  { key: 'factures' as const, label: 'Factures', description: 'Invoices' },
                  {
                    key: 'bonLivraison' as const,
                    label: 'Bon de Livraison',
                    description: 'Delivery notes',
                  },
                ],
              },
              {
                title: 'Finance',
                description: 'Payment tracking for sales and purchases.',
                modules: [
                  { key: 'paiements' as const, label: 'Paiements', description: 'Sales payments' },
                  {
                    key: 'paiementsAchat' as const,
                    label: 'Paiements achat',
                    description: 'Purchase payments',
                  },
                ],
              },
              {
                title: 'Contacts',
                description: 'Manage customers, suppliers and delivery staff.',
                modules: [
                  { key: 'clients' as const, label: 'Clients', description: 'Customer directory' },
                  {
                    key: 'fournisseurs' as const,
                    label: 'Fournisseurs',
                    description: 'Supplier directory',
                  },
                  {
                    key: 'livreurs' as const,
                    label: 'Livreurs',
                    description: 'Delivery personnel',
                  },
                ],
              },
              {
                title: 'Purchases',
                description: 'Inbound purchasing workflow.',
                modules: [
                  {
                    key: 'factureAchat' as const,
                    label: 'Facture achat',
                    description: 'Purchase invoices',
                  },
                  {
                    key: 'demandeDesPrix' as const,
                    label: 'Demande de prix',
                    description: 'Price requests (RFQ)',
                  },
                  {
                    key: 'bonAchat' as const,
                    label: "Bon d'achat",
                    description: 'Purchase orders',
                  },
                ],
              },
              {
                title: 'Catalog',
                description: 'Products and inventory organisation.',
                modules: [
                  { key: 'products' as const, label: 'Products', description: 'Product catalogue' },
                  {
                    key: 'warehouse' as const,
                    label: 'Warehouse',
                    description: 'Warehouse management',
                  },
                  { key: 'category' as const, label: 'Category', description: 'Category tree' },
                ],
              },
            ].map((group) => {
              const allOn = group.modules.every((m) => draftModules[m.key]);
              return (
                <div key={group.title} className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {group.title}
                      </p>
                      <p className="text-xs text-slate-400">{group.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !allOn;
                        setDraftModules((prev) => {
                          const patch: Partial<TenantModulesConfig> = {};
                          group.modules.forEach((m) => {
                            (patch as Record<string, boolean>)[m.key] = next;
                          });
                          return { ...prev, ...patch };
                        });
                      }}
                      className={`text-xs font-medium transition ${allOn ? 'text-red-500 hover:text-red-700 dark:text-red-400' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400'}`}
                    >
                      {allOn ? 'Disable all' : 'Enable all'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.modules.map(({ key, label, description }) => {
                      const enabled = draftModules[key];
                      return (
                        <div
                          key={key}
                          className="flex cursor-pointer items-center justify-between px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          onClick={() =>
                            setDraftModules((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${enabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p
                                className={`text-sm font-medium ${enabled ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
                              >
                                {label}
                              </p>
                              <p className="text-xs text-slate-400">{description}</p>
                            </div>
                          </div>
                          {/* Toggle */}
                          <span
                            className={[
                              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
                              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                                enabled ? 'translate-x-4' : 'translate-x-0.5',
                              ].join(' ')}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Save bar */}
            <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-white/90 px-5 py-4 shadow-lg backdrop-blur-sm dark:border-indigo-900/40 dark:bg-slate-900/90">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Changes are not saved until you click{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Save changes
                </span>
                .
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDraftModules(modulesData ?? DEFAULT_MODULES)}
                  className="btn-secondary text-sm"
                  disabled={updateModulesMutation.isPending}
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveModules}
                  disabled={updateModulesMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateModulesMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ DANGER ZONE TAB ══════════════════ */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/40 dark:bg-red-900/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Actions in this section may be irreversible. Proceed with care.
              </p>
            </div>

            {/* Status Actions */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status Control
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {canActivate && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                        <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Activate Tenant
                        </p>
                        <p className="text-xs text-slate-400">Re-enable and restore full access.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('activate')}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Activate
                    </button>
                  </div>
                )}
                {canDisable && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                        <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Disable Tenant
                        </p>
                        <p className="text-xs text-slate-400">
                          All requests will receive 403 until re-activated.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('disable')}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                    >
                      Disable
                    </button>
                  </div>
                )}
                {canDisable && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Suspend Tenant
                        </p>
                        <p className="text-xs text-slate-400">
                          Block access pending investigation or overdue payment.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('suspend')}
                      className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                    >
                      Suspend
                    </button>
                  </div>
                )}
                {tenant.status !== 'archived' && tenant.status !== 'deleted' && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <Archive className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Archive Tenant
                        </p>
                        <p className="text-xs text-slate-400">
                          Closes the DB connection. Can be unarchived later.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('archive')}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Archive
                    </button>
                  </div>
                )}
                {tenant.status === 'archived' && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                        <RotateCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Unarchive Tenant
                        </p>
                        <p className="text-xs text-slate-400">
                          Restore access — tenant returns to active status.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('unarchive')}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Unarchive
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Destructive Actions */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Destructive Actions
                </p>
              </div>
              <div className="divide-y divide-red-100/80 dark:divide-red-900/20">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                      <RefreshCw className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Reset Tenant Data
                      </p>
                      <p className="text-xs text-red-500/80 dark:text-red-500">
                        Drops and re-provisions the database. All data will be lost.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDialog('reset')}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Reset Data
                  </button>
                </div>
                {tenant.status !== 'deleted' && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                        <Trash2 className="h-4 w-4 text-red-700 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">
                          Delete Permanently
                        </p>
                        <p className="text-xs text-red-500/80 dark:text-red-500">
                          Destroys the DB, MinIO bucket, and Redis keys for{' '}
                          <strong>{tenant.name}</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDialog('delete')}
                      className="btn-danger text-xs py-2 px-4"
                    >
                      Delete Forever
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* /px-6 container */}

      {/* ══════════════════ CONFIRM DIALOGS ══════════════════ */}
      <ConfirmDialog
        open={dialog === 'activate'}
        title="Activate tenant?"
        description={`"${tenant.name}" will be re-enabled and accept requests again.`}
        confirmLabel="Activate"
        confirmVariant="default"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
        loading={activate.isPending}
      />
      <ConfirmDialog
        open={dialog === 'unarchive'}
        title="Unarchive tenant?"
        description={`"${tenant.name}" will be restored to active status.`}
        confirmLabel="Unarchive"
        confirmVariant="default"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
        loading={unarchive.isPending}
      />

      {/* Disable */}
      {dialog === 'disable' && (
        <InlineModal title="Disable tenant?" onClose={closeDialog}>
          <p className="mb-3 text-sm text-slate-500">
            All requests to <strong>{tenant.name}</strong> will return 403. Optionally provide a
            reason.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Reason (optional)"
            className="input"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={closeDialog} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={disable.isPending}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {disable.isPending ? 'Disabling…' : 'Disable'}
            </button>
          </div>
        </InlineModal>
      )}

      {/* Suspend */}
      {dialog === 'suspend' && (
        <InlineModal title="Suspend tenant?" onClose={closeDialog}>
          <p className="mb-3 text-sm text-slate-500">
            Temporarily block all access to <strong>{tenant.name}</strong>. Optionally provide a
            reason.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Reason (optional)"
            className="input"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={closeDialog} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={suspend.isPending}
              className="btn-danger text-sm"
            >
              {suspend.isPending ? 'Suspending…' : 'Suspend'}
            </button>
          </div>
        </InlineModal>
      )}

      {/* Archive */}
      {dialog === 'archive' && (
        <InlineModal title="Archive tenant?" onClose={closeDialog}>
          <p className="mb-3 text-sm text-slate-500">
            The DB connection will be closed. Type{' '}
            <strong className="text-slate-800 dark:text-slate-200">{tenant.name}</strong> to
            confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tenant.name}
            className="input"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={closeDialog} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmText !== tenant.name || archive.isPending}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {archive.isPending ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </InlineModal>
      )}

      {/* Delete */}
      {dialog === 'delete' && (
        <InlineModal title="Permanently delete tenant?" onClose={closeDialog}>
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">
              This will destroy the database, MinIO bucket, and Redis keys for{' '}
              <strong>{tenant.name}</strong>. This action is <strong>irreversible</strong>.
            </p>
          </div>
          <p className="mb-2 text-sm text-slate-500">
            Type{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
              DELETE {tenant.name}
            </code>{' '}
            to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`DELETE ${tenant.name}`}
            className="input font-mono"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={closeDialog} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmText !== `DELETE ${tenant.name}` || softDelete.isPending}
              className="btn-danger text-sm disabled:opacity-50"
            >
              {softDelete.isPending ? 'Deleting…' : 'Delete Forever'}
            </button>
          </div>
        </InlineModal>
      )}

      {/* Reset */}
      {dialog === 'reset' && (
        <InlineModal title="Reset tenant data?" onClose={closeDialog}>
          <p className="mb-3 text-sm text-slate-500">
            Drops and re-provisions the database for <strong>{tenant.name}</strong>. All data will
            be permanently lost. Type <strong>RESET</strong> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            className="input font-mono"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={closeDialog} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmText !== 'RESET' || reset.isPending}
              className="btn-danger text-sm disabled:opacity-50"
            >
              {reset.isPending ? 'Resetting…' : 'Reset Data'}
            </button>
          </div>
        </InlineModal>
      )}
    </div>
  );
}
