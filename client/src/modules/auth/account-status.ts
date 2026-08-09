import { ApiError } from '@/services/httpClient';

/** Approval state of a portal account, as returned by the API. */
export type AccountStatus = 'pending' | 'approved' | 'rejected';

/** Phone number of an account awaiting approval on this device. */
const PENDING_PHONE_KEY = 'orderium_pending_phone';

/**
 * Maps a failed login to the approval state that caused it.
 * `POST /portal/login` answers 403 only for pending or rejected accounts.
 */
export function accountStatusFromError(error: unknown): AccountStatus | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const message = error.apiMessage.toLowerCase();
  if (message.includes('rejected')) return 'rejected';
  return 'pending';
}

export function rememberPendingPhone(phone: string): void {
  localStorage.setItem(PENDING_PHONE_KEY, phone);
}

export function getPendingPhone(): string | null {
  return localStorage.getItem(PENDING_PHONE_KEY);
}

export function clearPendingPhone(): void {
  localStorage.removeItem(PENDING_PHONE_KEY);
}
