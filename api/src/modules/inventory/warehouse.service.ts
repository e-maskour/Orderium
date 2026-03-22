import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
  ) { }

  private get warehouseRepository(): Repository<Warehouse> {
    return this.tenantConnService.getRepository(Warehouse);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  async create(createDto: CreateWarehouseDto): Promise<Warehouse> {
    // Check if code already exists
    const existing = await this.warehouseRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Warehouse with code '${createDto.code}' already exists`,
      );
    }

    const warehouse = this.warehouseRepository.create(createDto);
    return this.warehouseRepository.save(warehouse);
  }

  async findAll(): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async update(id: number, updateDto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.findOne(id);

    // Check if code is being changed and already exists
    if (updateDto.code && updateDto.code !== warehouse.code) {
      const existing = await this.warehouseRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Warehouse with code '${updateDto.code}' already exists`,
        );
      }
    }

    Object.assign(warehouse, updateDto);
    return this.warehouseRepository.save(warehouse);
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.findOne(id);

    // Soft delete by setting isActive to false
    warehouse.isActive = false;
    await this.warehouseRepository.save(warehouse);
  }
}
