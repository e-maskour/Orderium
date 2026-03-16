import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    private readonly dataSource: DataSource,
  ) {}

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
