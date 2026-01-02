import { getPool } from '../db/pool';
import { deliveryService } from '../modules/delivery/delivery.service';
import { logger } from '../utils/logger';

export async function seedDeliveryPerson() {
  try {
    const pool = await getPool();

    logger.info('🌱 Starting delivery person seeding...');

    // Check if delivery person already exists
    const existingDelivery = await pool.request()
      .input('PhoneNumber', '0666473100')
      .query(`
        SELECT * FROM DeliveryPersons
        WHERE PhoneNumber = @PhoneNumber
      `);

    if (existingDelivery.recordset.length > 0) {
      logger.info('⏭️  Delivery person with phone 0666473100 already exists - skipping seed');
      
      // Also check Portal table
      const existingPortal = await pool.request()
        .input('PhoneNumber', '0666473100')
        .query(`
          SELECT * FROM Portal
          WHERE PhoneNumber = @PhoneNumber
        `);
      
      if (existingPortal.recordset.length > 0) {
        logger.info('✅ Portal account also exists for 0666473100');
      } else {
        logger.warn('⚠️  Portal account does NOT exist for 0666473100 - creating it now...');
        const deliveryPerson = existingDelivery.recordset[0];
        
        await pool.request()
          .input('PhoneNumber', '0666473100')
          .input('Password', await import('bcrypt').then(b => b.hash('123456', 10)))
          .input('DeliveryId', deliveryPerson.Id)
          .input('IsDelivery', true)
          .input('DateCreated', new Date())
          .input('DateUpdated', new Date())
          .query(`
            INSERT INTO Portal (PhoneNumber, Password, DeliveryId, IsDelivery, IsCustomer, DateCreated, DateUpdated)
            VALUES (@PhoneNumber, @Password, @DeliveryId, @IsDelivery, 0, @DateCreated, @DateUpdated)
          `);
        
        logger.info('✅ Created Portal account for existing delivery person');
      }
      
      return;
    }

    logger.info('📝 Creating delivery person and portal account...');

    // Create delivery person and portal account
    const deliveryPerson = await deliveryService.create({
      Name: 'Test Delivery',
      PhoneNumber: '0666473100',
      Email: 'delivery@test.com',
      Password: '123456',
    });

    logger.info(`✅ Seeded delivery person: ${deliveryPerson.Name} (ID: ${deliveryPerson.Id})`);
    logger.info(`   📱 Phone: ${deliveryPerson.PhoneNumber}`);
    logger.info(`   🔑 Password: 123456`);
    
    // Verify Portal record was created
    const portalRecord = await pool.request()
      .input('PhoneNumber', '0666473100')
      .query(`
        SELECT * FROM Portal
        WHERE PhoneNumber = @PhoneNumber
      `);
    
    if (portalRecord.recordset.length > 0) {
      logger.info(`✅ Portal account verified (ID: ${portalRecord.recordset[0].Id}, DeliveryId: ${portalRecord.recordset[0].DeliveryId})`);
    } else {
      logger.error('❌ Portal account was NOT created!');
    }

  } catch (error: any) {
    logger.error('❌ Failed to seed delivery person:', error.message);
    console.error(error);
    throw error;
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedDeliveryPerson()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}
