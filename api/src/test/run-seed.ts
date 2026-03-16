import { DataSource } from 'typeorm';
import { seedTestData } from './seed-test-data';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function bootstrap() {
  console.log('🔧 Connecting to database...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'orderium',
    entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected!\n');

    await seedTestData(dataSource);

    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
    console.log('🏁 Seeding script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

bootstrap();
