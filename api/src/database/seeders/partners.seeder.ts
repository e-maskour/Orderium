import { EntityManager } from 'typeorm';
import { Partner } from '../../modules/partners/entities/partner.entity';
import { SeederDefinition } from './seeder.types';

/** The walk-in customer every counter sale is booked against. */
const COMPTOIR = {
  name: 'Client Comptoir',
  phoneNumber: '0000000000',
  address: 'Comptoir',
  isEnabled: true,
  isCustomer: true,
  isSupplier: false,
};

export const partnersSeeder: SeederDefinition = {
  key: 'partners',
  name: 'Partners',
  description: 'Creates "Client Comptoir", the default counter-sale customer.',

  async check(m: EntityManager) {
    const count = await m
      .getRepository(Partner)
      .countBy({ name: COMPTOIR.name });
    return count > 0
      ? { missing: 0, detail: 'Client Comptoir present' }
      : { missing: 1, detail: 'Client Comptoir missing' };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(Partner);
    const existing = await repo.findOne({ where: { name: COMPTOIR.name } });
    if (existing) {
      return {
        created: 0,
        pruned: 0,
        detail: 'Client Comptoir already exists',
      };
    }
    await repo.save(repo.create(COMPTOIR));
    return { created: 1, pruned: 0, detail: 'Created Client Comptoir' };
  },
};
