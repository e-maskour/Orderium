import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantConnectionService } from './tenant-connection.service';
import { tenantStorage } from './tenant.context';
import { Tenant } from './tenant.entity';

/** Augmented Express Request that carries the resolved Tenant */
export interface RequestWithTenant extends Request {
  tenant: Tenant;
}

/**
 * Runs on every business request (applied globally in AppModule, excluded only
 * for health + tenant-admin management routes).
 *
 * Responsibilities:
 *  1. Extract tenant slug from `X-Tenant-ID` header or Origin/Referer subdomain.
 *  2. Validate the tenant exists, is not deleted, and is active.
 *  3. Pre-warm the tenant's database connection.
 *  4. Attach the Tenant object to `req.tenant`.
 *  5. Run the rest of the pipeline inside AsyncLocalStorage so that
 *     TenantConnectionService can resolve the correct DataSource without
 *     REQUEST-scoped injection.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Use originalUrl (full path before any prefix stripping) for exclusion checks
    const url = (req.originalUrl ?? req.url ?? req.path).split('?')[0];
    if (
      url === '/' ||
      url === '/api/health' ||
      url === '/health' ||
      url.startsWith('/api/admin/tenants') ||
      url.startsWith('/admin/tenants') ||
      url.startsWith('/api/super-admin/') ||
      url.startsWith('/api/onboarding/public-status')
    ) {
      return next();
    }

    const tenantSlug = this.extractTenantSlug(req);

    if (!tenantSlug) {
      throw new UnauthorizedException(
        'Missing tenant identifier. Provide X-Tenant-ID header or call from a valid tenant subdomain.',
      );
    }

    const tenant = await this.tenantService.getTenantBySlug(tenantSlug);

    if (!tenant) {
      throw new NotFoundException(`Unknown tenant: '${tenantSlug}'`);
    }

    // Deleted / archived tenants → 404
    if (
      tenant.status === 'deleted' ||
      tenant.status === 'archived' ||
      tenant.deletedAt
    ) {
      throw new NotFoundException(`This organization does not exist.`);
    }

    // Expired trial — double-check even if cron hasn't run yet
    if (tenant.status === 'trial') {
      if (tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
        throw new ForbiddenException({
          error: 'TRIAL_EXPIRED',
          message:
            'Your free trial has ended. Please contact your administrator to activate your subscription.',
          trialEndedAt: tenant.trialEndsAt,
        });
      }
    }

    // Expired subscription
    if (tenant.status === 'expired') {
      throw new ForbiddenException({
        error: 'SUBSCRIPTION_EXPIRED',
        message:
          'Your subscription has expired. Please renew to continue using the service.',
      });
    }

    // Suspended
    if (tenant.status === 'suspended') {
      throw new ForbiddenException({
        error: 'TENANT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.',
        reason: tenant.statusReason,
      });
    }

    // Disabled
    if (tenant.status === 'disabled' || !tenant.isActive) {
      throw new ForbiddenException({
        error: 'TENANT_DISABLED',
        message: 'Your account is currently disabled. Please contact support.',
      });
    }

    await this.tenantConnectionService.getConnection(tenantSlug);

    (req as RequestWithTenant).tenant = tenant;

    tenantStorage.run(
      { tenantSlug: tenant.slug, tenantId: tenant.id, tenantName: tenant.name },
      () => next(),
    );
  }

  /**
   * Extract the tenant slug — never trust raw input; sanitise before use.
   *
   * Priority order:
   *   1. `X-Tenant-ID` header (explicit, lowest friction for API clients)
   *   2. Subdomain parsed from `Origin` header  → {slug}-admin|app|delivery.domain.tld
   *   3. Subdomain parsed from `Referer` header (browser fallback)
   */
  private extractTenantSlug(req: Request): string | null {
    const header = req.headers['x-tenant-id'];
    if (typeof header === 'string' && header.trim()) {
      return this.sanitise(header.trim());
    }

    const originLike = req.headers['origin'] ?? req.headers['referer'];
    if (originLike) {
      const match = originLike.match(
        /^https?:\/\/([a-z0-9-]+)-(admin|app|delivery)\./i,
      );
      if (match) return this.sanitise(match[1]);
    }

    return null;
  }

  private sanitise(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
}
