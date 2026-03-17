import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';
import { SuperAdminGuard } from './tenant.guard';
import { Payment } from '../tenant-lifecycle/entities/payment.entity';
import { TenantActivityLog } from '../tenant-lifecycle/entities/tenant-activity-log.entity';

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
    TypeOrmModule.forFeature([Tenant, Payment, TenantActivityLog], 'master'),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantConnectionService, SuperAdminGuard],
  exports: [TenantService, TenantConnectionService],
})
export class TenantModule { }

// Re-export the middleware so AppModule can import it cleanly
export { TenantMiddleware };
