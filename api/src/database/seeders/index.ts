import { DataSource } from 'typeorm';
import { seedConfigurations } from './configurations.seeder';

export async function runSeeders(dataSource: DataSource) {
  console.log('🌱 Running database seeders...\n');

  try {
    await seedConfigurations(dataSource);
    
    console.log('\n✅ All seeders completed successfully');
  } catch (error) {
    console.error('\n❌ Error running seeders:', error);
    throw error;
  }
}
