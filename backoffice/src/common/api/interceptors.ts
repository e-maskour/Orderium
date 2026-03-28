/**
 * ═══════════════════════════════════════════════════════════════
 *  MOROCOM — Default Request & Response Interceptors
 * ═══════════════════════════════════════════════════════════════
 *
 *  Pre-configured interceptors for:
 *  • Console logging (dev only)
 *  • Global error normalization
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    RequestInterceptor,
    ResponseInterceptor,
} from '../types/api.types';
import { ApiError } from '../types/api.types';

// ─── Logging Interceptor (development only) ────────────────────

export const loggingInterceptor: RequestInterceptor & ResponseInterceptor = {
    onRequest(options) {
        if (import.meta.env.DEV) {
            console.debug(`[API] ${options.method} ${options.url}`);
        }
        return options;
    },
    onResponse(response) {
        if (import.meta.env.DEV) {
            console.debug(`[API] Response: ${response.code} — ${response.message}`);
        }
        return response;
    },
    onError(error: ApiError) {
        if (import.meta.env.DEV) {
            console.error(`[API] Error: ${error.status} ${error.code} — ${error.message}`);
        }
        return error;
    },
};
