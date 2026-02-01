import { DataSource } from 'typeorm';
import { Portal } from '../../modules/portal/entities/portal.entity';
import * as bcrypt from 'bcrypt';

export async function seedPortal(dataSource: DataSource) {
  console.log('🔄 Seeding portal admin user...');

  const portalRepository = dataSource.getRepository(Portal);

  // Check if admin already exists
  const existingAdmin = await portalRepository.findOne({
    where: { name: 'admin' },
  });

  if (existingAdmin) {
    console.log('   ℹ️  Admin user already exists, skipping...');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create admin user
  const adminUser = portalRepository.create({
    phoneNumber: '0666666666',
    name: 'admin',
    password: hashedPassword,
    email: 'admin@orderium.com',
    isAdmin: true,
    isCustomer: false,
    isDelivery: false,
    isActive: true,
  });

  await portalRepository.save(adminUser);
  console.log('   ✅ Admin user created successfully');
  console.log('   📝 Username: admin');
  console.log('   🔑 Password: 123456');
}
