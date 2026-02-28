/**
 * ═══════════════════════════════════════════════════════════════
 *  ORDERIUM — Enterprise API Client
 * ═══════════════════════════════════════════════════════════════
 *
 *  Centralized, strongly-typed HTTP client that replaces all
 *  direct fetch() usage. Features:
 *
 *  • Typed GET / POST / PUT / PATCH / DELETE methods
 *  • Automatic Authorization header injection
 *  • Request & response interceptor pipeline
 *  • Structured ApiError with status codes
 *  • Optional retry with exponential backoff
 *  • Request cancellation via AbortController
 *  • Configurable timeouts
 *  • Automatic 401 → logout handling
 * ═══════════════════════════════════════════════════════════════
 */

import {
    type ApiResponseBody,
    type RequestConfig,
    type RequestOptions,
    type RequestInterceptor,
    type ResponseInterceptor,
    type HttpMethod,
    ApiError,
} from '../types/api.types';
import { tokenManager } from '../auth/token-manager';

// ─── Configuration ─────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1_000; // 1 second base
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// ─── Interceptor Registry ──────────────────────────────────────

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    requestInterceptors.push(interceptor);
    return () => {
        const idx = requestInterceptors.indexOf(interceptor);
        if (idx !== -1) requestInterceptors.splice(idx, 1);
    };
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    responseInterceptors.push(interceptor);
    return () => {
        const idx = responseInterceptors.indexOf(interceptor);
        if (idx !== -1) responseInterceptors.splice(idx, 1);
    };
}

// ─── URL Helpers ───────────────────────────────────────────────

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        }
    }

    return url.toString();
}

// ─── Retry Logic ───────────────────────────────────────────────

function getRetryDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff with jitter
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = exponential * 0.1 * Math.random();
    return exponential + jitter;
}

function isRetryable(status: number): boolean {
    return RETRY_STATUS_CODES.has(status);
}

// ─── Core Request Engine ───────────────────────────────────────

async function executeRequest<T>(options: RequestOptions, baseUrl: string): Promise<ApiResponseBody<T>> {
    // Run request interceptors
    let processedOptions = { ...options };
    for (const interceptor of requestInterceptors) {
        processedOptions = await interceptor.onRequest(processedOptions);
    }

    const {
        method,
        url,
        body,
        headers = {},
        params,
        signal,
        skipAuth = false,
        timeout = DEFAULT_TIMEOUT,
        retries = DEFAULT_RETRIES,
        retryDelay = DEFAULT_RETRY_DELAY,
        rawResponse = false,
    } = processedOptions;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : buildUrl(baseUrl, url, params);

    // Build headers
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    // Inject auth token
    if (!skipAuth) {
        const token = tokenManager.getAccessToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    // Handle FormData — remove Content-Type so browser sets boundary
    const isFormData = body instanceof FormData;
    if (isFormData) {
        delete requestHeaders['Content-Type'];
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal,
    };

    if (body !== undefined && method !== 'GET') {
        fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }

    // Timeout wrapper
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortController: AbortController | undefined;

    if (timeout > 0 && !signal) {
        abortController = new AbortController();
        fetchOptions.signal = abortController.signal;
        timeoutId = setTimeout(() => abortController!.abort(), timeout);
    }

    const attemptFetch = async (attempt: number): Promise<ApiResponseBody<T>> => {
        try {
            const response = await fetch(fullUrl, fetchOptions);

            if (timeoutId) clearTimeout(timeoutId);

            // Handle raw response (blobs, etc.)
            if (rawResponse) {
                return { code: 'RAW', status: response.status, message: 'OK', data: response as unknown as T, metadata: null };
            }

            // Handle non-OK responses
            if (!response.ok) {
                let errorBody: ErrorResponseBodyPartial = {
                    code: `ERR${response.status}_00`,
                    status: response.status,
                    message: response.statusText,
                    data: null,
                    metadata: null,
                };

                try {
                    const parsed = await response.json();
                    errorBody = { ...errorBody, ...parsed };
                } catch {
                    // Response body wasn't JSON — use status text
                }

                const apiError = new ApiError(
                    errorBody.message,
                    errorBody.status,
                    errorBody.code,
                    null,
                    errorBody.metadata as ApiError['metadata'],
                    response,
                );

                // Handle 401 — trigger unauthorized flow
                if (response.status === 401) {
                    tokenManager.onUnauthorized();
                    throw apiError;
                }

                // Retry on retryable errors
                if (attempt < retries && isRetryable(response.status)) {
                    const delay = getRetryDelay(attempt, retryDelay);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return attemptFetch(attempt + 1);
                }

                // Run response error interceptors
                let processedError = apiError;
                for (const interceptor of responseInterceptors) {
                    processedError = await interceptor.onError(processedError);
                }

                throw processedError;
            }

            // Parse successful response
            const data: ApiResponseBody<T> = await response.json();

            // Run response interceptors
            let processedResponse = data;
            for (const interceptor of responseInterceptors) {
                processedResponse = await interceptor.onResponse(processedResponse);
            }

            return processedResponse;
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);

            if (error instanceof ApiError) {
                throw error;
            }

            // Network error or abort
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new ApiError('Request timeout', 0, 'TIMEOUT');
            }

            if (error instanceof TypeError && error.message.includes('fetch')) {
                // Network failure — retry
                if (attempt < retries) {
                    const delay = getRetryDelay(attempt, retryDelay);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return attemptFetch(attempt + 1);
                }
                throw new ApiError('Network error: Unable to reach the server', 0, 'NETWORK_ERROR');
            }

            throw new ApiError(
                error instanceof Error ? error.message : 'Unknown error occurred',
                0,
                'UNKNOWN_ERROR',
            );
        }
    };

    return attemptFetch(0);
}

// Helper type for parsing error bodies
interface ErrorResponseBodyPartial {
    code: string;
    status: number;
    message: string;
    data: null;
    metadata: unknown;
}

// ─── API Client Class ──────────────────────────────────────────

class ApiClient {
    constructor(private readonly baseUrl: string) { }

    async get<T>(url: string, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'GET', url, ...config }, this.baseUrl);
    }

    async post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'POST', url, body, ...config }, this.baseUrl);
    }

    async put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'PUT', url, body, ...config }, this.baseUrl);
    }

    async patch<T>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'PATCH', url, body, ...config }, this.baseUrl);
    }

    async delete<T>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'DELETE', url, body, ...config }, this.baseUrl);
    }

    /**
     * For raw responses (binary data, blobs, etc.).
     * Returns the raw Response object as data.
     */
    async raw(method: HttpMethod, url: string, config?: RequestConfig): Promise<Response> {
        const result = await executeRequest<Response>({ method, url, ...config, rawResponse: true }, this.baseUrl);
        return result.data;
    }

    /**
     * Upload FormData (multipart). Automatically removes Content-Type header.
     */
    async upload<T>(url: string, formData: FormData, config?: RequestConfig): Promise<ApiResponseBody<T>> {
        return executeRequest<T>({ method: 'POST', url, body: formData, ...config }, this.baseUrl);
    }
}

// ─── Singleton Instance ────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = new ApiClient(API_BASE_URL);

/**
 * @deprecated Use `apiClient` instead. Kept for gradual migration compatibility.
 */
export const API_BASE_URL_VALUE = API_BASE_URL;
