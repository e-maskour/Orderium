import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';
import { runSeeders } from './seeders';

async function seed() {
  let dataSource: DataSource | undefined;

  try {
    // Initialize data source
    dataSource = await AppDataSource.initialize();
    console.log('📦 Database connection established\n');

    // Run seeders
    await runSeeders(dataSource);

    // Close connection
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

seed();
