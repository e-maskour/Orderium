import { useState, useEffect, useRef, type ReactNode } from 'react';
import { BlockedScreen } from './BlockedScreen';
import { TrialBanner } from './TrialBanner';
import { getTenantPublicStatus, type TenantPublicStatus } from '../api/onboarding';
import { addResponseInterceptor } from '../common/api/api-client';
import type { ApiError } from '../common/types/api.types';

type BlockedReason = 'suspended' | 'disabled' | 'subscription_expired' | 'trial_expired';

interface Props {
    children: ReactNode;
}

// ─── Reactive layer: intercept any 403 with a tenant-block error ─────────────
// Callback set by the mounted TenantStatusGuard component.
let _notifyBlocked: ((reason: BlockedReason) => void) | null = null;

function detectBlockedReason(error: ApiError): BlockedReason | null {
    // Archived / deleted tenants: middleware returns 404 "This organization does not exist."
    if (error.status === 404) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('organization does not exist') || msg.includes('does not exist')) {
            return 'disabled';
        }
    }

    if (error.status !== 403) return null;

    // Dev mode: the API filter puts the business error code inside metadata.details
    const details = (error.metadata as Record<string, unknown> | null)?.['details'] as
        | Record<string, unknown>
        | undefined;
    if (details?.['error'] === 'TENANT_SUSPENDED') return 'suspended';
    if (details?.['error'] === 'TENANT_DISABLED') return 'disabled';
    if (details?.['error'] === 'SUBSCRIPTION_EXPIRED') return 'subscription_expired';
    if (details?.['error'] === 'TRIAL_EXPIRED') return 'trial_expired';

    // Production fallback: the human-readable message always contains the clue
    const msg = error.message.toLowerCase();
    if (msg.includes('suspended')) return 'suspended';
    if (msg.includes('disabled')) return 'disabled';
    if (msg.includes('subscription') && msg.includes('expired')) return 'subscription_expired';
    if (msg.includes('trial') && (msg.includes('ended') || msg.includes('expired'))) return 'trial_expired';

    return null;
}

// Registered once when this module is first imported. The interceptor is
// stateless — it just calls whatever callback the mounted component set.
addResponseInterceptor({
    onResponse: (res) => res,
    onError: (error: ApiError) => {
        const reason = detectBlockedReason(error);
        if (reason) _notifyBlocked?.(reason);
        return error;
    },
});

// ─── Proactive layer: fetch status on startup ─────────────────────────────────
// Module-level cache so all ProtectedRoute instances share one fetch result.
let cachedTenantInfo: TenantPublicStatus | null | undefined = undefined;
let fetchPromise: Promise<TenantPublicStatus | null> | null = null;

function fetchTenantInfo(): Promise<TenantPublicStatus | null> {
    if (cachedTenantInfo !== undefined) {
        return Promise.resolve(cachedTenantInfo);
    }
    if (fetchPromise) return fetchPromise;

    // Uses the public-status endpoint which is never blocked by TenantMiddleware,
    // so even suspended/disabled tenants get the correct status back.
    fetchPromise = getTenantPublicStatus()
        .then((info) => {
            cachedTenantInfo = info;
            return info;
        })
        .catch(() => {
            cachedTenantInfo = null;
            return null;
        });

    return fetchPromise;
}

/**
 * Wraps protected routes.
 *
 * Two-layer approach:
 *  1. Proactive — fetches /api/onboarding/public-status once on mount; works
 *     even before any real API call is made, because that endpoint bypasses
 *     TenantMiddleware status checks.
 *  2. Reactive — a global response interceptor watches every API call for a
 *     403 with TENANT_SUSPENDED / TENANT_DISABLED / *_EXPIRED and immediately
 *     flips to the BlockedScreen without waiting for the next navigation.
 */
export function TenantStatusGuard({ children }: Props) {
    const [tenantInfo, setTenantInfo] = useState<TenantPublicStatus | null | undefined>(cachedTenantInfo);
    const [blockedByApi, setBlockedByApi] = useState<BlockedReason | null>(null);
    const fetched = useRef(cachedTenantInfo !== undefined);

    // Wire the reactive interceptor callback to this component's state setter.
    useEffect(() => {
        _notifyBlocked = setBlockedByApi;
        return () => { _notifyBlocked = null; };
    }, []);

    // Proactive: fetch tenant status on first mount.
    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;
        fetchTenantInfo().then((info) => setTenantInfo(info));
    }, []);

    // Reactive path takes priority — a live API call confirmed the block.
    if (blockedByApi) {
        return <BlockedScreen reason={blockedByApi} />;
    }

    // While the proactive check is still in-flight, render children transparently.
    if (tenantInfo === undefined || tenantInfo === null) {
        return <>{children}</>;
    }

    const { status, trialDaysRemaining, trialEndsAt } = tenantInfo;

    if (status === 'suspended') return <BlockedScreen reason="suspended" />;
    if (status === 'disabled') return <BlockedScreen reason="disabled" />;
    if (status === 'archived' || status === 'deleted') return <BlockedScreen reason="disabled" />;
    if (status === 'expired') return <BlockedScreen reason="subscription_expired" />;

    const trialEndedNow =
        status === 'trial' &&
        trialEndsAt != null &&
        new Date(trialEndsAt) < new Date();

    if (trialEndedNow) return <BlockedScreen reason="trial_expired" />;

    return (
        <>
            {status === 'trial' && trialDaysRemaining != null && trialDaysRemaining <= 14 && (
                <TrialBanner daysRemaining={trialDaysRemaining} trialEndsAt={trialEndsAt} />
            )}
            {children}
        </>
    );
}

