import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TenantModule } from '../tenant/tenant.module';
import { AccessController } from './access.controller';
import { AccessControlService } from './access-control.service';
import { AccessCoverageService } from './access-coverage.service';
import { AccessSyncService } from './access-sync.service';

/**
 * Global so that `PermissionsGuard`, registered as an APP_GUARD, and any
 * service wanting to invalidate the access cache can inject
 * `AccessControlService` without importing this module everywhere.
 */
@Global()
@Module({
  imports: [DiscoveryModule, TenantModule],
  controllers: [AccessController],
  providers: [AccessControlService, AccessSyncService, AccessCoverageService],
  exports: [AccessControlService, AccessSyncService],
})
export class AccessModule {}
