import { SeederDefinition } from './seeder.types';
import { warehousesSeeder } from './warehouse.seeder';
import { uomSeeder } from './uom.seeder';
import { partnersSeeder } from './partners.seeder';
import { portalSeeder } from './portal.seeder';
import { configurationsSeeder } from './configurations.seeder';
import { sequencesSeeder } from './sequences.seeder';
import { notificationTemplatesSeeder } from './notification-templates.seeder';
import { accessControlSeeder } from './access-control.seeder';

/**
 * Every seeder the platform knows about, in dependency order.
 *
 * Order matters on a fresh database: access control reads the `portal` table
 * when backfilling administrators, and sequences assume their tables exist.
 * It does not matter for a converged tenant, where each seeder is a no-op.
 */
export const SEEDERS: SeederDefinition[] = [
  warehousesSeeder,
  uomSeeder,
  partnersSeeder,
  portalSeeder,
  configurationsSeeder,
  sequencesSeeder,
  notificationTemplatesSeeder,
  accessControlSeeder,
];

/**
 * Seeders a freshly provisioned tenant receives. Portal is excluded: tenant
 * users come from the onboarding flow, which supplies real credentials.
 */
export const TENANT_SEEDER_KEYS = SEEDERS.filter(
  (s) => s.key !== portalSeeder.key,
).map((s) => s.key);

export function getSeeder(key: string): SeederDefinition | undefined {
  return SEEDERS.find((s) => s.key === key);
}
