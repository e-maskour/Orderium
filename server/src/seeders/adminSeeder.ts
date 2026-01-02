import { getPool } from '../db/pool';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function seedAdmin() {
  try {
    const pool = await getPool();

    logger.info('🌱 Starting admin seeding...');

    // Check if admin already exists
    const existingAdmin = await pool.request()
      .input('PhoneNumber', '0600000000')
      .query(`
        SELECT * FROM Portal
        WHERE PhoneNumber = @PhoneNumber
      `);

    if (existingAdmin.recordset.length > 0) {
      logger.info('⏭️  Admin with phone 0600000000 already exists - skipping seed');
      logger.info('✅ Admin credentials: 0600000000 / admin123');
      return;
    }

    logger.info('📝 Creating admin account...');

    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const now = new Date();

    // Create admin portal account (no CustomerId or DeliveryId - admin only)
    await pool.request()
      .input('PhoneNumber', '0600000000')
      .input('Password', hashedPassword)
      .input('IsCustomer', false)
      .input('IsDelivery', false)
      .input('DateCreated', now)
      .input('DateUpdated', now)
      .query(`
        INSERT INTO Portal (PhoneNumber, Password, IsCustomer, IsDelivery, DateCreated, DateUpdated)
        VALUES (@PhoneNumber, @Password, @IsCustomer, @IsDelivery, @DateCreated, @DateUpdated)
      `);

    logger.info('✅ Admin account created successfully!');
    logger.info('   📱 Phone: 0600000000');
    logger.info('   🔑 Password: admin123');
    logger.info('   👤 Type: Admin (not customer or delivery)');

  } catch (error: any) {
    logger.error('❌ Failed to seed admin:', error.message);
    console.error(error);
    throw error;
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedAdmin()
    .then(() => {
      logger.info('Admin seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Admin seeding failed:', error);
      process.exit(1);
    });
}
