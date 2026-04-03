import { useNavigate } from 'react-router-dom';
import type { Tenant } from '../types/tenant';
import { StatusBadge } from './StatusBadge';
import { SkeletonRow } from './Skeleton';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  tenants: Tenant[];
  loading?: boolean;
}

const PLAN_BADGES: Record<string, string> = {
  trial: 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-900/30 dark:text-blue-400',
  basic:
    'bg-indigo-50 text-indigo-700 ring-indigo-600/10 dark:bg-indigo-900/30 dark:text-indigo-400',
  pro: 'bg-violet-50 text-violet-700 ring-violet-600/10 dark:bg-violet-900/30 dark:text-violet-400',
  enterprise:
    'bg-purple-50 text-purple-700 ring-purple-600/10 dark:bg-purple-900/30 dark:text-purple-400',
};

function formatExpiry(tenant: Tenant): { label: string; urgent: boolean } | null {
  if (tenant.status === 'trial' && tenant.trialEndsAt) {
    const days = tenant.trialDaysRemaining ?? 0;
    return {
      label: days === 0 ? 'Trial ends today' : `Trial ends in ${days}d`,
      urgent: days <= 3,
    };
  }
  if (tenant.subscriptionEndsAt) {
    const diff = new Date(tenant.subscriptionEndsAt).getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    if (days >= 0 && days <= 30) {
      return {
        label: days === 0 ? 'Expires today' : `Expires in ${days}d`,
        urgent: days <= 7,
      };
    }
  }
  return null;
}

export function TenantTable({ tenants, loading = false }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Tenant', 'Plan', 'Status', 'Max Users', 'Expires / Ends', 'Created', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : tenants.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                No tenants match the current filters.
              </td>
            </tr>
          ) : (
            tenants.map((t) => {
              const expiry = formatExpiry(t);
              const planBadge = PLAN_BADGES[t.subscriptionPlan] ?? PLAN_BADGES.basic;

              return (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tenants/${t.id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {/* Tenant name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          className="h-9 w-9 rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: t.primaryColor ?? '#6366f1' }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {t.name}
                        </p>
                        <code className="text-[11px] text-slate-400 dark:text-slate-500">
                          {t.slug}
                        </code>
                      </div>
                    </div>
                  </td>

                  {/* Plan badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${planBadge}`}
                    >
                      {t.subscriptionPlan}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} trialDaysRemaining={t.trialDaysRemaining} />
                  </td>

                  {/* Max users */}
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {t.maxUsers.toLocaleString()}
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3">
                    {expiry ? (
                      <span
                        className={`flex items-center gap-1.5 text-xs font-medium ${expiry.urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}
                      >
                        {expiry.urgent && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                        {expiry.label}
                      </span>
                    ) : t.subscriptionEndsAt ? (
                      <span className="text-xs text-slate-400">
                        {new Date(t.subscriptionEndsAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>

                  {/* View arrow */}
                  <td className="px-4 py-3">
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
