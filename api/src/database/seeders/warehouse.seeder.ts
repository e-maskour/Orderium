import { EntityManager } from 'typeorm';
import { Warehouse } from '../../modules/inventory/entities/warehouse.entity';
import { SeederDefinition } from './seeder.types';

export const DEFAULT_WAREHOUSE = {
  name: 'Depot WH1',
  code: 'WH1',
  isActive: true,
};

export const warehousesSeeder: SeederDefinition = {
  key: 'warehouses',
  name: 'Warehouses',
  description: 'Creates the default depot every tenant needs to hold stock.',

  async check(m: EntityManager) {
    const count = await m
      .getRepository(Warehouse)
      .countBy({ code: DEFAULT_WAREHOUSE.code });
    return count > 0
      ? { missing: 0, detail: 'Default warehouse present' }
      : {
          missing: 1,
          detail: `Default warehouse ${DEFAULT_WAREHOUSE.code} missing`,
        };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(Warehouse);
    const existing = await repo.findOne({
      where: { code: DEFAULT_WAREHOUSE.code },
    });
    if (existing) {
      return {
        created: 0,
        pruned: 0,
        detail: 'Default warehouse already exists',
      };
    }
    await repo.save(repo.create(DEFAULT_WAREHOUSE));
    return {
      created: 1,
      pruned: 0,
      detail: `Created warehouse ${DEFAULT_WAREHOUSE.name}`,
    };
  },
};
