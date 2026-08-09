import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';
import { runSeeders, SeederOptionsByKey } from './seeders';

/**
 * Credentials for the portal admin seeder.
 *
 * Read from the environment so nothing is hard-coded. When no password is
 * supplied we generate one and print it exactly once, which keeps a local
 * `pnpm seed` frictionless without reintroducing a shared known password.
 */
function portalOptions(): { options: SeederOptionsByKey; generated?: string } {
  const supplied = process.env.SEED_ADMIN_PASSWORD;
  const password = supplied || randomBytes(18).toString('base64url');

  return {
    generated: supplied ? undefined : password,
    options: {
      portal: {
        name: process.env.SEED_ADMIN_NAME || 'admin',
        phoneNumber: process.env.SEED_ADMIN_PHONE || '0600000000',
        email: process.env.SEED_ADMIN_EMAIL || 'admin@morocom.local',
        password,
      },
    },
  };
}

async function seed() {
  let dataSource: DataSource | undefined;

  try {
    dataSource = await AppDataSource.initialize();
    console.log('📦 Database connection established\n');

    const { options, generated } = portalOptions();
    await runSeeders(dataSource, options);

    if (generated) {
      console.log(
        `\n🔑 Generated portal admin password (shown once): ${generated}`,
      );
      console.log(
        '   Set SEED_ADMIN_PASSWORD to choose your own on the next run.',
      );
    }

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
