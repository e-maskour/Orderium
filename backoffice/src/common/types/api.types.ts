/**
 * ═══════════════════════════════════════════════════════════════
 *  ORDERIUM — Unified API Response & Request Types
 * ═══════════════════════════════════════════════════════════════
 *
 *  Mirrors the backend ApiResponseBody contract exactly.
 *  Every service must use these types for full type safety.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Response Types ────────────────────────────────────────────

export interface ApiResponseBody<T = unknown> {
    code: string;
    status: number;
    message: string;
    data: T;
    metadata: PaginationMeta | Record<string, unknown> | null;
}

export interface PaginationMeta {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    [key: string]: unknown;
}

export interface ErrorResponseBody {
    code: string;
    status: number;
    message: string;
    data: null;
    metadata: {
        timestamp?: string;
        path?: string;
        method?: string;
        details?: unknown;
    } | null;
}

// ─── Request Types ─────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
    skipAuth?: boolean;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    rawResponse?: boolean;
}

export interface RequestOptions extends RequestConfig {
    method: HttpMethod;
    url: string;
    body?: unknown;
}

// ─── Interceptor Types ─────────────────────────────────────────

export interface RequestInterceptor {
    onRequest: (options: RequestOptions) => RequestOptions | Promise<RequestOptions>;
}

export interface ResponseInterceptor {
    onResponse: <T>(response: ApiResponseBody<T>) => ApiResponseBody<T> | Promise<ApiResponseBody<T>>;
    onError: (error: ApiError) => ApiError | Promise<ApiError>;
}

// ─── Error Types ───────────────────────────────────────────────

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string,
        public readonly data: null = null,
        public readonly metadata: ErrorResponseBody['metadata'] = null,
        public readonly originalResponse?: Response,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    get isUnauthorized(): boolean {
        return this.status === 401;
    }

    get isForbidden(): boolean {
        return this.status === 403;
    }

    get isNotFound(): boolean {
        return this.status === 404;
    }

    get isServerError(): boolean {
        return this.status >= 500;
    }

    get isNetworkError(): boolean {
        return this.status === 0;
    }

    get isTimeout(): boolean {
        return this.code === 'TIMEOUT';
    }
}

// ─── Token Types ───────────────────────────────────────────────

export interface TokenProvider {
    getAccessToken: () => string | null;
    setAccessToken: (token: string) => void;
    clearTokens: () => void;
    onUnauthorized: () => void;
}
