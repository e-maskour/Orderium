import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private get warehouseRepository(): Repository<Warehouse> {
    return this.tenantConnService.getRepository(Warehouse);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private warehouseKey(suffix: string): string {
    return `tenant:${this.tenantSlug}:warehouse:${suffix}`;
  }

  private async invalidateWarehouseCache(id?: number): Promise<void> {
    await this.cacheManager.del(this.warehouseKey('all'));
    if (id) await this.cacheManager.del(this.warehouseKey(`${id}`));
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
    const saved = await this.warehouseRepository.save(warehouse);
    await this.invalidateWarehouseCache();
    return saved;
  }

  async findAll(): Promise<Warehouse[]> {
    const key = this.warehouseKey('all');
    const cached = await this.cacheManager.get<Warehouse[]>(key);
    if (cached) return cached;

    const result = await this.warehouseRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    await this.cacheManager.set(key, result, 300_000);
    return result;
  }

  async findOne(id: number): Promise<Warehouse> {
    const key = this.warehouseKey(`${id}`);
    const cached = await this.cacheManager.get<Warehouse>(key);
    if (cached) return cached;

    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    await this.cacheManager.set(key, warehouse, 300_000);
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
    const saved = await this.warehouseRepository.save(warehouse);
    await this.invalidateWarehouseCache(id);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.findOne(id);

    // Soft delete by setting isActive to false
    warehouse.isActive = false;
    await this.warehouseRepository.save(warehouse);
    await this.invalidateWarehouseCache(id);
  }
}
