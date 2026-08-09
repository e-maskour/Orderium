import { Injectable, Logger } from '@nestjs/common';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import {
  syncAccessControl,
  SyncAccessControlResult,
} from '../../database/seeders/access-control.seeder';
import { AccessControlService } from './access-control.service';

/**
 * Reconciles a tenant database with the access registry on demand.
 *
 * The migration performs this once at upgrade time; this service exposes the
 * same idempotent routine so that a tenant provisioned mid-release, or one
 * that drifted, can be repaired without another migration.
 *
 * `backfillAdministrators` is deliberately off here: re-granting Administrator
 * to every role-less admin is correct exactly once, during the migration, and
 * would otherwise quietly undo a deliberate revocation.
 */
@Injectable()
export class AccessSyncService {
  private readonly logger = new Logger(AccessSyncService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly accessControl: AccessControlService,
  ) {}

  async sync(): Promise<SyncAccessControlResult> {
    const dataSource = this.tenantConnService.getCurrentDataSource();
    const result = await syncAccessControl(dataSource, {
      backfillAdministrators: false,
    });
    await this.accessControl.invalidate();
    this.logger.log(
      `Access control synchronised — ${result.permissionsUpserted} permissions, ` +
        `${result.rolesCreated.length} role(s) created, ` +
        `${result.permissionsPruned} obsolete permission(s) pruned`,
    );
    return result;
  }
}
