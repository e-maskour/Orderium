import { apiClient, API_ROUTES } from '../common';
import type { ICompany } from '../modules/company/company.interface';

export interface OnboardingStatus {
    is_onboarded: boolean;
    steps: {
        company_profile: boolean;
        super_admin: boolean;
    };
}

export interface CreateAdminPayload {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    profilePhoto?: string;
}

export interface OnboardingAdmin {
    id: number;
    phoneNumber: string;
    email: string;
    name: string;
    fullName: string;
    isAdmin: boolean;
    isCustomer: boolean;
    isDelivery: boolean;
}

export interface AdminCreatedResponse {
    user: OnboardingAdmin;
    token: string;
}

// Module-level cache so concurrent callers (OnboardingGate, Login, TenantStatusGuard)
// share a single in-flight request and never hit the server more than once per page load.
let _statusPromise: Promise<OnboardingStatus> | null = null;

export function getOnboardingStatus(): Promise<OnboardingStatus> {
    if (_statusPromise) return _statusPromise;
    _statusPromise = apiClient
        .get<OnboardingStatus>(API_ROUTES.ONBOARDING.STATUS, { skipAuth: true } as any)
        .then((res) => (res as any).data ?? res)
        .catch((err) => {
            _statusPromise = null; // allow retry on error
            return Promise.reject(err);
        });
    return _statusPromise;
}

/** Call this after onboarding completes so the next navigation re-fetches fresh status. */
export function invalidateOnboardingStatus(): void {
    _statusPromise = null;
    _publicStatusPromise = null;
}

export interface TenantPublicStatus {
    status: 'trial' | 'active' | 'expired' | 'suspended' | 'disabled' | 'archived' | 'deleted';
    isActive: boolean;
    statusReason: string | null;
    trialDaysRemaining: number | null;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
}

let _publicStatusPromise: Promise<TenantPublicStatus | null> | null = null;

/**
 * Fetches the tenant's current status from the public endpoint that is NOT
 * blocked by TenantMiddleware. This means it returns the real status even
 * when the tenant is suspended or disabled.
 */
export function getTenantPublicStatus(): Promise<TenantPublicStatus | null> {
    if (_publicStatusPromise) return _publicStatusPromise;
    _publicStatusPromise = apiClient
        .get<TenantPublicStatus>('/api/onboarding/public-status', { skipAuth: true } as any)
        .then((res) => (res as any).data ?? null)
        .catch(() => {
            _publicStatusPromise = null;
            return null;
        });
    return _publicStatusPromise;
}

export async function submitCompanyProfile(data: ICompany): Promise<void> {
    await apiClient.post<unknown>(API_ROUTES.ONBOARDING.COMPANY, data, {
        skipAuth: true,
    } as any);
}

export async function submitAdminAccount(
    data: CreateAdminPayload,
): Promise<AdminCreatedResponse> {
    const res = await apiClient.post<AdminCreatedResponse>(
        API_ROUTES.ONBOARDING.ADMIN,
        data,
        { skipAuth: true } as any,
    );
    return (res as any).data ?? res;
}

export async function completeOnboarding(): Promise<void> {
    await apiClient.post<unknown>(API_ROUTES.ONBOARDING.COMPLETE, {}, { skipAuth: true } as any);
}
