import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { tenantStorage } from '../tenant/tenant.context';
import { UsageTrackerService } from './usage-tracker.service';

/**
 * Paths that must never be counted, because counting them is either
 * meaningless or self-referential (the metrics dashboard polling its own
 * numbers would inflate the usage it reports).
 */
const IGNORED_PREFIXES = ['admin/', 'super-admin/', 'health', 'queues'];

/**
 * Global interceptor that feeds {@link UsageTrackerService}.
 *
 * Adds one Redis pipeline per request and nothing else — no database write, no
 * awaited I/O, and no behaviour change if the tracker is unavailable.
 */
@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
  constructor(private readonly tracker: UsageTrackerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // Requests outside a tenant context (super-admin routes, health checks)
    // have no tenant to attribute usage to.
    const ctx = tenantStorage.getStore();
    if (!ctx) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      url?: string;
      route?: { path?: string };
      user?: { id?: number };
    }>();

    const path = this.normalisePath(request.route?.path ?? request.url ?? '');
    if (IGNORED_PREFIXES.some((p) => path.startsWith(p))) {
      return next.handle();
    }

    const startedAt = Date.now();
    const module = path.split('/')[0] || 'root';
    const isLogin = request.method === 'POST' && path.endsWith('login');

    const finish = (statusCode: number): void => {
      const durationMs = Date.now() - startedAt;
      this.tracker.record({
        tenantSlug: ctx.tenantSlug,
        module,
        userId: request.user?.id ?? null,
        statusCode,
        durationMs,
        isLogin,
      });
      this.tracker.recordSlowPeak(ctx.tenantSlug, durationMs);
    };

    return next.handle().pipe(
      tap(() => finish(http.getResponse<{ statusCode: number }>().statusCode)),
      catchError((err: unknown) => {
        // An exception filter has not run yet, so read the status off the
        // thrown error and fall back to 500 for anything unrecognised.
        const status =
          typeof err === 'object' && err !== null && 'status' in err
            ? Number((err as { status: unknown }).status) || 500
            : 500;
        finish(status);
        return throwError(() => err);
      }),
    );
  }

  /** `/api/orders/42` → `orders/42`; route patterns keep their `:id` params. */
  private normalisePath(raw: string): string {
    return raw
      .split('?')[0]
      .replace(/^\/+/, '')
      .replace(/^api\/+/, '')
      .replace(/\/+$/, '');
  }
}
