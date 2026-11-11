import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from './subscription.service';
import type {
  CurrentSubscription,
  SubscriptionResource,
  SubscriptionUsage,
} from './subscription.interface';

/**
 * Pre-emptive plan-limit checks for the back-office.
 *
 * The API stays the source of truth (it answers 403 PLAN_LIMIT_REACHED), but
 * the create screens read the same usage first so the user sees "limit
 * reached, change your plan" instead of filling a form that cannot be saved.
 * Only creation is blocked — every other screen keeps working.
 */

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'current'] as const;

/** Shared, cached read of `/subscription/current` (same key as the subscription page). */
export function useCurrentSubscription(options?: {
  refetchOnMount?: boolean | 'always';
  enabled?: boolean;
}) {
  return useQuery<CurrentSubscription>({
    enabled: options?.enabled ?? true,
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => subscriptionService.getCurrent(),
    staleTime: 15_000,
    retry: 1,
    refetchOnMount: options?.refetchOnMount ?? true,
  });
}

/** True when nothing more of this resource can be added (`-1` = unlimited, `0` = not included). */
export function isLimitReached(usage: SubscriptionUsage | undefined): boolean {
  return !!usage && usage.max >= 0 && usage.used >= usage.max;
}

export interface PlanLimitState {
  usage: SubscriptionUsage | undefined;
  planName: string;
  reached: boolean;
  /** True until the first answer — callers fail open on errors. */
  loading: boolean;
}

export function usePlanLimit(
  resource: SubscriptionResource,
  options?: { refetchOnMount?: boolean | 'always' },
): PlanLimitState {
  const query = useCurrentSubscription(options);
  const usage = query.data?.limits?.[resource];
  return {
    usage,
    planName: query.data?.plan?.name ?? '',
    reached: isLimitReached(usage),
    loading: query.isLoading,
  };
}

// ─── "Limit reached" dialog (opened from anywhere) ──────────────────────────

export interface PlanLimitDialogDetail {
  resource?: SubscriptionResource;
  used?: number;
  limit?: number;
  plan?: string;
  /** API sentence, shown when the resource is unknown. */
  message?: string;
}

export const PLAN_LIMIT_EVENT = 'marnova:plan-limit-reached';

/** Opens the global "limit reached" dialog (PlanLimitDialogHost must be mounted). */
export function openPlanLimitDialog(detail: PlanLimitDialogDetail): void {
  window.dispatchEvent(new CustomEvent<PlanLimitDialogDetail>(PLAN_LIMIT_EVENT, { detail }));
}

/**
 * Wraps a "create" action: runs it while the plan allows one more item,
 * otherwise opens the "limit reached" dialog instead.
 */
export function usePlanLimitGuard(resource: SubscriptionResource) {
  const { usage, planName, reached } = usePlanLimit(resource);
  return useCallback(
    (action: () => void) => {
      if (!reached) {
        action();
        return;
      }
      openPlanLimitDialog({ resource, used: usage?.used, limit: usage?.max, plan: planName });
    },
    [reached, resource, usage?.used, usage?.max, planName],
  );
}

const RESOURCES: SubscriptionResource[] = [
  'users',
  'products',
  'warehouses',
  'deliveryPersons',
  'ordersPerMonth',
  'storageMb',
];

export function asSubscriptionResource(value: unknown): SubscriptionResource | undefined {
  return RESOURCES.includes(value as SubscriptionResource)
    ? (value as SubscriptionResource)
    : undefined;
}
