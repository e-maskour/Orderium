import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Admin credentials live in sessionStorage: they are cleared when the browser
 * closes. Signing in (email + password + 2FA) yields the session token; the
 * platform API key is entered afterwards from the dashboard and is required by
 * every admin endpoint.
 *
 * "Remember this device" keeps two signed, 30-day tokens in localStorage so they
 * survive a browser restart and a sign-out:
 *   - the device token, which skips the 2FA step (the password is still asked);
 *   - the API-key grant, sent instead of the raw key (the key itself is never
 *     persisted).
 */
const TOKEN_KEY = 'admin_token';
const API_KEY = 'admin_key';
const DEVICE_KEY = 'admin_trusted_device';
const GRANT_KEY = 'admin_key_grant';

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}
function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Trusted-device token: skips the 2FA code at the next sign-ins on this browser. */
export const trustedDevice = {
  get: () => readLocal(DEVICE_KEY),
  set: (token: string) => writeLocal(DEVICE_KEY, token),
  clear: () => writeLocal(DEVICE_KEY, null),
};

export const authStorage = {
  get token() {
    return read(TOKEN_KEY);
  },
  get isSignedIn() {
    return Boolean(read(TOKEN_KEY));
  },
  setToken(token: string) {
    write(TOKEN_KEY, token);
  },
  /** Ends the session. A remembered device and API-key grant are kept on purpose. */
  clear() {
    write(TOKEN_KEY, null);
    apiKeyStore.clearSessionKey();
    writeLocal(API_KEY, null); // legacy key-only login
  },
};

/**
 * The platform API key, observable so the header / banner / dialog stay in
 * sync. `request()` asks the UI to open the "enter API key" dialog.
 */
type KeyListener = () => void;
const keyListeners = new Set<KeyListener>();
const requestListeners = new Set<KeyListener>();
let cachedKey = read(API_KEY);
let cachedGrant = readLocal(GRANT_KEY);
const notify = () => keyListeners.forEach((l) => l());

export const apiKeyStore = {
  /** Truthy while admin tools are unlocked (raw key for this session, or a remembered grant). */
  get: () => cachedKey ?? cachedGrant,
  /** True when the unlock comes from a remembered grant on this device. */
  isRemembered: () => !cachedKey && Boolean(cachedGrant),
  /** Raw key, kept for this browser session only. */
  set(key: string) {
    cachedKey = key;
    write(API_KEY, key);
    notify();
  },
  /** Signed grant returned by the API when "remember on this device" is ticked. */
  remember(grant: string) {
    cachedKey = null;
    write(API_KEY, null);
    cachedGrant = grant;
    writeLocal(GRANT_KEY, grant);
    notify();
  },
  clearSessionKey() {
    cachedKey = null;
    write(API_KEY, null);
    notify();
  },
  /** Forgets both the session key and the remembered grant. */
  clear() {
    cachedKey = null;
    cachedGrant = null;
    write(API_KEY, null);
    writeLocal(GRANT_KEY, null);
    notify();
  },
  subscribe(l: KeyListener) {
    keyListeners.add(l);
    return () => {
      keyListeners.delete(l);
    };
  },
  request() {
    requestListeners.forEach((l) => l());
  },
  onRequest(l: KeyListener) {
    requestListeners.add(l);
    return () => {
      requestListeners.delete(l);
    };
  },
};

/** Messages SuperAdminGuard returns (403) when the API key is missing / wrong. */
const API_KEY_ERROR = /super-admin API key/i;

export function isApiKeyError(err: unknown): boolean {
  const res = (err as { response?: { status?: number; data?: { message?: unknown } } }).response;
  return res?.status === 403 && API_KEY_ERROR.test(String(res.data?.message ?? ''));
}

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = authStorage.token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (cachedKey && !config.headers['X-Super-Admin-Key']) {
    config.headers['X-Super-Admin-Key'] = cachedKey;
  } else if (cachedGrant && !config.headers['X-Super-Admin-Key']) {
    config.headers['X-Super-Admin-Grant'] = cachedGrant;
  }
  return config;
});

/** Sign-in step endpoints report bad credentials as 401 — that must not sign out. */
const SIGN_IN_STEP = /^\/?admin\/auth\/(login|2fa\/)/;

// Unwrap the ApiResponseInterceptor envelope `{ code, status, message, data, metadata }`
// so every API function receives the raw payload directly.
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body !== null && typeof body === 'object' && 'data' in body && 'message' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !SIGN_IN_STEP.test(error.config?.url ?? '')) {
      authStorage.clear();
      window.location.href = '/login';
    } else if (isApiKeyError(error)) {
      // Signed in, but the platform key is missing or wrong — ask for it.
      if (apiKeyStore.get()) apiKeyStore.clear();
      apiKeyStore.request();
    }
    return Promise.reject(error);
  },
);

/** Server error message from an axios error, falling back to `fallback`. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  if (typeof msg === 'string' && msg) return msg;
  if (Array.isArray(msg) && msg.length) return String(msg[0]);
  return fallback;
}
