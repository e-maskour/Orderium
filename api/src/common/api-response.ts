/**
 * Unified API Response Types & Helpers
 * Single source of truth for all API response contracts.
 *
 * Response codes are string-based domain codes defined in response-codes.ts.
 * Format: PREFIX + HTTP_STATUS + "_" + SEQUENCE  (e.g. ORD201_01)
 */

import { ResponseDef } from './response-codes';

// ─── Interfaces ────────────────────────────────────────────────

export interface ApiResponseBody<T = any> {
  code: string;
  status: number;
  message: string;
  data: T;
  metadata?: PaginationMeta | Record<string, any> | null;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  [key: string]: any;
}

export interface ErrorResponseBody {
  code: string;
  status: number;
  message: string;
  data: null;
  metadata?: {
    timestamp?: string;
    path?: string;
    method?: string;
    details?: any;
  } | null;
}

// ─── ApiResult Marker Class ────────────────────────────────────

export class ApiResult<T = any> {
  readonly __isApiResult = true;

  constructor(
    public readonly data: T,
    public readonly message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly metadata?: Record<string, any> | null,
  ) {}
}

// ─── Helper Builders ───────────────────────────────────────────

/** Wrap data with a specific ResponseDef from response-codes.ts */
export function ApiRes<T>(
  def: ResponseDef,
  data: T,
  metadata?: Record<string, any> | null,
): ApiResult<T> {
  return new ApiResult(
    data,
    def.message,
    def.code,
    def.status,
    metadata ?? null,
  );
}

/** Wrap a paginated list with a specific ResponseDef */
export function ApiPaginated<T>(
  def: ResponseDef,
  data: T[],
  pagination: PaginationMeta,
): ApiResult<T[]> {
  return new ApiResult(data, def.message, def.code, def.status, pagination);
}
