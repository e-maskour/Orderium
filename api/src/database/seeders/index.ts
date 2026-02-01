/* eslint-disable prettier/prettier */
import { DataSource } from 'typeorm';
import { seedConfigurations } from './configurations.seeder';
import { seedWarehouses } from './warehouse.seeder';
import { seedUnitOfMeasures } from './uom.seeder';
import { seedPartners } from './partners.seeder';
import { seedPortal } from './portal.seeder';

export async function runSeeders(dataSource: DataSource) {
  console.log('🌱 Running database seeders...\n');

  try {
    await seedWarehouses(dataSource);
    await seedUnitOfMeasures(dataSource);
    await seedPartners(dataSource);
    await seedPortal(dataSource);
    await seedConfigurations(dataSource);
    
    console.log('\n✅ All seeders completed successfully');
  } catch (error) {
    console.error('\n❌ Error running seeders:', error);
    throw error;
  }
}
