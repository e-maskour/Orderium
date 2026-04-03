/**
 * App Context Provider
 * Builds safe context for AI assistant without exposing sensitive data
 */

import { SafeAppContext } from '../types/aiAssistant';

export class AppContextProvider {
  /**
   * Build safe context for AI assistant
   * CRITICAL: Never include tokens, passwords, API keys, or PII
   */
  static buildContext(userState: any, routerState: any, appState?: any): SafeAppContext {
    return {
      user: {
        id: userState?.uid || 'anonymous',
        role: userState?.role || 'user',
        displayName: userState?.displayName || 'User',
        permissions: userState?.permissions || [],
      },

      navigation: {
        currentRoute: routerState?.pathname || window.location.pathname,
        moduleName: this.extractModule(routerState?.pathname || window.location.pathname),
        pageTitle: document.title,
        breadcrumbs: this.extractBreadcrumbs(routerState),
      },

      selection: this.getSelection(),

      recentErrors: this.getSanitizedErrors(appState?.errorLog || []),

      recentApiCalls: this.getSanitizedApiCalls(appState?.apiCallLog || []),

      appState: {
        theme: appState?.theme || 'light',
        language: appState?.language || 'en',
        activeFilters: this.sanitizeFilters(appState?.filters),
        activePage: appState?.pagination?.currentPage,
      },
    };
  }

  /**
   * Extract current selection (text, item, etc.)
   */
  private static getSelection(): SafeAppContext['selection'] {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      return {
        type: 'text',
        value: selectedText.substring(0, 500), // Limit length
      };
    }

    // Check if user selected a table row, card, etc.
    const activeElement = document.activeElement;
    const selectedItem = activeElement?.getAttribute('data-item-id');

    if (selectedItem) {
      return {
        type: 'item',
        value: selectedItem,
        metadata: {
          itemType: activeElement?.getAttribute('data-item-type'),
        },
      };
    }

    return { type: 'none' };
  }

  /**
   * Sanitize error logs (remove stack traces, sensitive data)
   */
  private static getSanitizedErrors(errorLog: any[]): SafeAppContext['recentErrors'] {
    return (errorLog || [])
      .slice(-5) // Last 5 errors
      .map((err) => ({
        timestamp: err.timestamp || Date.now(),
        message: this.sanitizeErrorMessage(err.message || 'Unknown error'),
        component: err.component || 'unknown',
        severity: err.severity || 'error',
      }));
  }

  private static sanitizeErrorMessage(message: string): string {
    // Remove file paths, tokens, emails
    return message
      .replace(/\/[^\s]+/g, '[path]') // File paths
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
      .replace(/tok_[a-zA-Z0-9]+/g, '[token]')
      .replace(/Bearer\s+[^\s]+/g, '[auth]')
      .substring(0, 200);
  }

  /**
   * Sanitize API call logs (remove responses with PII)
   */
  private static getSanitizedApiCalls(apiLog: any[]): SafeAppContext['recentApiCalls'] {
    return (apiLog || []).slice(-5).map((call) => ({
      endpoint: call.endpoint?.replace(/\/\d+/g, '/:id') || '/unknown', // Replace IDs
      method: call.method || 'GET',
      status: call.status || 0,
      timestamp: call.timestamp || Date.now(),
      responseSummary: call.status === 200 ? 'Success' : `Error ${call.status}`,
    }));
  }

  private static sanitizeFilters(filters: any): Record<string, any> {
    // Only include filter keys, not sensitive values
    if (!filters) return {};

    const sanitized: Record<string, any> = {};
    for (const key in filters) {
      sanitized[key] = typeof filters[key];
    }
    return sanitized;
  }

  private static extractModule(path: string): string {
    const match = path.match(/^\/([^/]+)/);
    return match ? match[1] : 'home';
  }

  private static extractBreadcrumbs(routerState: any): string[] {
    // Implementation depends on your router
    return routerState?.breadcrumbs || [];
  }
}
