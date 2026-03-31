/**
 * ═══════════════════════════════════════════════════════════════
 *  MOROCOM — Token Management Strategy
 * ═══════════════════════════════════════════════════════════════
 *
 *  Handles token storage, retrieval, and unauthorized callbacks.
 *  Single source of truth for authentication token management.
 * ═══════════════════════════════════════════════════════════════
 */

import type { TokenProvider } from '../types/api.types';

const ACCESS_TOKEN_KEY = 'adminToken';

let unauthorizedCallback: (() => void) | null = null;

export const tokenManager: TokenProvider = {
    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    setAccessToken(token: string): void {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },

    clearTokens(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem('admin');
    },

    onUnauthorized(): void {
        tokenManager.clearTokens();
        if (unauthorizedCallback) {
            unauthorizedCallback();
        } else {
            // Fallback: redirect to login
            window.location.href = '/login';
        }
    },
};

/**
 * Register a callback to run on 401 responses (e.g., from AuthContext).
 */
export function setUnauthorizedHandler(handler: () => void): void {
    unauthorizedCallback = handler;
}
