import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Tenant } from '../modules/tenant/tenant.entity';
import { Payment } from '../modules/tenant-lifecycle/entities/payment.entity';
import { SubscriptionPlan } from '../modules/tenant-lifecycle/entities/subscription-plan.entity';
import { TenantActivityLog } from '../modules/tenant-lifecycle/entities/tenant-activity-log.entity';
import { MigrationRunLog } from '../modules/super-admin/entities/migration-log.entity';

config({ path: '.env.local' });
config(); // fallback

/**
 * TypeORM DataSource for the `orderium_master` database.
 * Used for:
 *   - Running master migrations (creates the `tenants` table)
 *   - CLI commands: `npm run migration:run:master`
 *
 * Only registers the Tenant entity — all business entities belong
 * in per-tenant databases managed by TenantConnectionService.
 */
export const MasterDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.MASTER_DB_NAME || 'orderium_master',
  entities: [Tenant, Payment, SubscriptionPlan, TenantActivityLog, MigrationRunLog],
  migrations: [__dirname + '/master-migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
