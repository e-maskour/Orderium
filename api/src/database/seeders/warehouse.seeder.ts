import { DataSource } from 'typeorm';
import { Warehouse } from '../../modules/inventory/entities/warehouse.entity';

export async function seedWarehouses(dataSource: DataSource) {
  const warehouseRepository = dataSource.getRepository(Warehouse);

  const defaultWarehouse = {
    name: 'Depot WH1',
    code: 'WH1',
    isActive: true,
  };

  const existing = await warehouseRepository.findOne({
    where: { code: defaultWarehouse.code },
  });

  if (!existing) {
    await warehouseRepository.save(warehouseRepository.create(defaultWarehouse));
    console.log(`✓ Created default warehouse: ${defaultWarehouse.name}`);
  } else {
    console.log(`- Warehouse already exists: ${defaultWarehouse.name}`);
  }
}
