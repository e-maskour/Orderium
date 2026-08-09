const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Error thrown for any non-2xx response. `message` keeps the historical
 * `HTTP error! status: <code>, body: <text>` shape so existing catch blocks
 * that sniff the string still work; prefer reading `status` / `body`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly bodyText: string;
  readonly body: unknown;

  constructor(status: number, bodyText: string) {
    super(`HTTP error! status: ${status}, body: ${bodyText}`);
    this.name = 'ApiError';
    this.status = status;
    this.bodyText = bodyText;
    try {
      this.body = JSON.parse(bodyText);
    } catch {
      this.body = undefined;
    }
  }

  /** Message sent by the API, when the body is the usual Nest error shape. */
  get apiMessage(): string {
    const body = this.body as { message?: unknown } | undefined;
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join(', ');
    return '';
  }
}

export async function http<T>(url: string, options?: RequestInit): Promise<T> {
  // Get auth token from localStorage
  const token = localStorage.getItem('orderium_token');

  const res = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new ApiError(res.status, errorBody);
  }

  return res.json();
}

export { API_BASE_URL };
