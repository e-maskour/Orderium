import { DataSource } from 'typeorm';
import { seedConfigurations } from './configurations.seeder';
import { seedWarehouses } from './warehouse.seeder';
import { seedUnitOfMeasures } from './uom.seeder';
import { seedPartners } from './partners.seeder';
import { seedPortal } from './portal.seeder';
import { seedNotificationTemplates } from './notification-templates.seeder';
import { seedSequences } from './sequences.seeder';

export async function runSeeders(dataSource: DataSource) {
  console.log('🌱 Running database seeders...\n');

  try {
    await seedWarehouses(dataSource);
    await seedUnitOfMeasures(dataSource);
    await seedPartners(dataSource);
    await seedPortal(dataSource);
    await seedConfigurations(dataSource);
    await seedSequences(dataSource);
    await seedNotificationTemplates(dataSource);

    console.log('\n✅ All seeders completed successfully');
  } catch (error) {
    console.error('\n❌ Error running seeders:', error);
    throw error;
  }
}

/**
 * Run seeders for a freshly-provisioned tenant database.
 * Portal/user seeders are intentionally excluded — tenant users are
 * created through the normal onboarding flow.
 */
export async function runTenantSeeders(dataSource: DataSource) {
  console.log('🌱 Running tenant seeders...\n');

  try {
    await seedWarehouses(dataSource);
    await seedUnitOfMeasures(dataSource);
    await seedPartners(dataSource);
    await seedConfigurations(dataSource);
    await seedSequences(dataSource);
    await seedNotificationTemplates(dataSource);

    console.log('\n✅ Tenant seeders completed successfully');
  } catch (error) {
    console.error('\n❌ Error running tenant seeders:', error);
    throw error;
  }
}
