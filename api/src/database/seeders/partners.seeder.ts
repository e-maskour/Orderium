import { DataSource } from 'typeorm';
import { Partner } from '../../modules/partners/entities/partner.entity';

export async function seedPartners(dataSource: DataSource) {
  console.log('🔄 Seeding partners...');
  
  const partnerRepository = dataSource.getRepository(Partner);

  // Check if "Client Comptoir" already exists
  const existingComptoir = await partnerRepository.findOne({
    where: { name: 'Client Comptoir' }
  });

  if (existingComptoir) {
    console.log('   ℹ️  Client Comptoir already exists, skipping...');
    return;
  }

  // Create "Client Comptoir" - a default client for counter/cash sales
  const comptoirClient = partnerRepository.create({
    name: 'Client Comptoir',
    phoneNumber: '0000000000',
    address: 'Comptoir',
    isEnabled: true,
    isCustomer: true,
    isSupplier: false,
  });

  await partnerRepository.save(comptoirClient);
  console.log('   ✅ Client Comptoir created successfully');
}
