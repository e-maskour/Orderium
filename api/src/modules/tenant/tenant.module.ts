import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';
import { SuperAdminGuard } from './tenant.guard';
import { PlanEntitlementsService } from './plan-entitlements.service';
import { PlanFeatureGuard } from './plan-feature.guard';
import { SubscriptionController } from './subscription.controller';
import { TenantActivityLog } from '../tenant-lifecycle/entities/tenant-activity-log.entity';
import { SubscriptionPlan } from '../tenant-lifecycle/entities/subscription-plan.entity';

/**
 * TenantModule uses the named 'master' TypeORM connection
 * (see AppModule for its registration).
 *
 * Exports TenantService and TenantConnectionService so that:
 *  - AppModule can inject them into TenantMiddleware
 *  - Other feature modules can extend TenantAwareService
 */
@Module({
  imports: [
    // Registers Tenant repository against the 'master' connection only
    TypeOrmModule.forFeature(
      [Tenant, TenantActivityLog, SubscriptionPlan],
      'master',
    ),
  ],
  controllers: [TenantController, SubscriptionController],
  providers: [
    TenantService,
    TenantConnectionService,
    SuperAdminGuard,
    PlanEntitlementsService,
    PlanFeatureGuard,
  ],
  exports: [
    TenantService,
    TenantConnectionService,
    PlanEntitlementsService,
    PlanFeatureGuard,
  ],
})
export class TenantModule {}

// Re-export the middleware so AppModule can import it cleanly
export { TenantMiddleware };
