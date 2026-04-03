/**
 * @deprecated — Import from `@/common` instead.
 * Kept only for backward compatibility during migration.
 */
export { apiClient, API_BASE_URL_VALUE as API_BASE_URL } from '../common';

import { apiClient } from '../common';

/**
 * @deprecated Use `apiClient.get<T>()` / `apiClient.post<T>()` etc. instead.
 */
export async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = ((options.method as string) || 'GET').toUpperCase() as
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE';
  const body = options.body ? JSON.parse(options.body as string) : undefined;
  const result = await apiClient[
    method === 'GET'
      ? 'get'
      : method === 'POST'
        ? 'post'
        : method === 'PUT'
          ? 'put'
          : method === 'PATCH'
            ? 'patch'
            : 'delete'
  ]<T>(url, ...(body !== undefined ? [body] : []));
  return result.data;
}
