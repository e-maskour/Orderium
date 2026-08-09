import { DataSource, EntityManager } from 'typeorm';
import { SEEDERS, TENANT_SEEDER_KEYS, getSeeder } from './registry';
import { SeederDefinition, SeederOptions } from './seeder.types';

export { SEEDERS, TENANT_SEEDER_KEYS, getSeeder };
export * from './seeder.types';

/** Per-seeder options, keyed by seeder key. */
export type SeederOptionsByKey = Record<string, SeederOptions>;

async function runList(
  manager: EntityManager,
  seeders: SeederDefinition[],
  optionsByKey: SeederOptionsByKey,
  label: string,
): Promise<void> {
  console.log(`🌱 Running ${label}...\n`);

  try {
    for (const seeder of seeders) {
      const result = await seeder.run(manager, optionsByKey[seeder.key]);
      console.log(`  ✔ ${seeder.name}: ${result.detail}`);
    }
    console.log(`\n✅ ${label} completed successfully`);
  } catch (error) {
    console.error(`\n❌ Error running ${label}:`, error);
    throw error;
  }
}

/**
 * Full seed, including the portal admin user.
 *
 * `portal` has required credential options, so callers must supply them under
 * `optionsByKey.portal` — there is deliberately no default password.
 */
export async function runSeeders(
  dataSource: DataSource,
  optionsByKey: SeederOptionsByKey = {},
): Promise<void> {
  return runList(dataSource.manager, SEEDERS, optionsByKey, 'database seeders');
}

/**
 * Seed a freshly provisioned tenant database. Portal is excluded — tenant
 * users are created through the normal onboarding flow.
 */
export async function runTenantSeeders(
  dataSource: DataSource,
  optionsByKey: SeederOptionsByKey = {},
): Promise<void> {
  const seeders = SEEDERS.filter((s) => TENANT_SEEDER_KEYS.includes(s.key));
  return runList(dataSource.manager, seeders, optionsByKey, 'tenant seeders');
}
