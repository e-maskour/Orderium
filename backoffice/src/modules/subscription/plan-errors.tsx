import { notify } from '@orderium/ui';
import { addResponseInterceptor } from '../../common/api/api-client';
import type { ApiError } from '../../common/types/api.types';
import { translations, type Language } from '../../lib/i18n';
import { markPlanErrorShown, wasPlanErrorShown } from '../../services/toast.service';

/**
 * Plan enforcement errors (HTTP 403) sent by the API when the subscription
 * blocks an action:
 *   { error: 'PLAN_LIMIT_REACHED', resource, limit, used, plan, message }
 *   { error: 'PLAN_FEATURE_UNAVAILABLE', feature, plan, message }
 * In development the payload sits in `metadata.details`; in production
 * metadata is stripped, so the French message is used as a fallback clue.
 */
export interface PlanError {
  kind: 'limit' | 'feature';
  message: string;
  resource?: string;
  feature?: string;
  limit?: number;
  used?: number;
  plan?: string;
}

export const SUBSCRIPTION_PATH = '/subscription';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function getPlanError(error: unknown): PlanError | null {
  const err = asRecord(error);
  if (!err || err['status'] !== 403) return null;

  const message = typeof err['message'] === 'string' ? (err['message'] as string) : '';
  const details = asRecord(asRecord(err['metadata'])?.['details']);
  const code = details?.['error'];
  const detailMessage =
    typeof details?.['message'] === 'string' ? (details['message'] as string) : '';
  const text = message || detailMessage;

  if (code === 'PLAN_LIMIT_REACHED') {
    return {
      kind: 'limit',
      message: text,
      resource: details?.['resource'] as string | undefined,
      limit: details?.['limit'] as number | undefined,
      used: details?.['used'] as number | undefined,
      plan: details?.['plan'] as string | undefined,
    };
  }
  if (code === 'PLAN_FEATURE_UNAVAILABLE') {
    return {
      kind: 'feature',
      message: text,
      feature: details?.['feature'] as string | undefined,
      plan: details?.['plan'] as string | undefined,
    };
  }

  // Production fallback — the API messages are stable French sentences.
  const lower = message.toLowerCase();
  if (lower.startsWith('limite de votre abonnement')) return { kind: 'limit', message };
  if (lower.includes("votre abonnement n'inclut pas")) return { kind: 'feature', message };
  return null;
}

/** Same resolution order as LanguageContext, readable outside React. */
function currentLanguage(): Language {
  try {
    const stored =
      localStorage.getItem('user-language') ?? localStorage.getItem('tenant-default-language');
    if (stored === 'fr' || stored === 'ar') return stored;
  } catch {
    /* storage unavailable */
  }
  return 'ar';
}

/** Client-side navigation from outside the router (BrowserRouter listens to popstate). */
function goToSubscription() {
  if (window.location.pathname === SUBSCRIPTION_PATH) return;
  window.history.pushState({}, '', SUBSCRIPTION_PATH);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function showPlanErrorToast(planError: PlanError) {
  const strings = translations[currentLanguage()];
  const title =
    planError.message ||
    (planError.kind === 'limit'
      ? strings.planErrorLimitFallback
      : strings.planErrorFeatureFallback);

  // Several parallel calls can hit the same wall — one toast is enough.
  if (wasPlanErrorShown(title)) return;
  markPlanErrorShown(title);

  let toastId = '';
  const description = (
    <button
      type="button"
      onClick={() => {
        notify.dismiss(toastId);
        goToSubscription();
      }}
      style={{
        marginTop: '0.375rem',
        padding: 0,
        border: 'none',
        background: 'none',
        color: 'var(--primary-color, #235ae4)',
        fontWeight: 600,
        fontSize: '0.8125rem',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {strings.planErrorSeeSubscription}
    </button>
  );
  toastId = notify.warning(title, { description, duration: 8000 });
}

let registered = false;

/**
 * Registers a global response interceptor (same mechanism as
 * TenantStatusGuard) that turns plan enforcement 403s into one clear toast
 * with a link to the subscription page. Callers keep their own error handling;
 * `toastError` skips a message this interceptor has just shown, so the user
 * never sees the same sentence twice.
 */
export function registerPlanErrorInterceptor(): void {
  if (registered) return;
  registered = true;
  addResponseInterceptor({
    onResponse: (res) => res,
    onError: (error: ApiError) => {
      const planError = getPlanError(error);
      if (planError) showPlanErrorToast(planError);
      return error;
    },
  });
}
