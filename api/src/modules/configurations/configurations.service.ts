import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Configuration } from './entities/configuration.entity';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class ConfigurationsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private get configRepository(): Repository<Configuration> {
    return this.tenantConnService.getRepository(Configuration);
  }

  async findAll(): Promise<Configuration[]> {
    const cacheKey = 'configurations:all';
    const cached = await this.cacheManager.get<Configuration[]>(cacheKey);
    if (cached) return cached;

    const result = await this.configRepository.find({
      order: { entity: 'ASC' },
    });
    await this.cacheManager.set(cacheKey, result, 300_000);
    return result;
  }

  async findOne(id: number): Promise<Configuration> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Configuration with ID ${id} not found`);
    }
    return config;
  }

  async findByEntity(entity: string): Promise<Configuration> {
    const cacheKey = `configurations:entity:${entity}`;
    const cached = await this.cacheManager.get<Configuration>(cacheKey);
    if (cached) return cached;

    let config = await this.configRepository.findOne({ where: { entity } });

    // Create sequences entity if it doesn't exist
    if (!config && entity === 'sequences') {
      config = await this.create({
        entity: 'sequences',
        values: { sequences: [] },
      });
    }

    // Create my_company entity with defaults if it doesn't exist
    if (!config && entity === 'my_company') {
      config = await this.create({
        entity: 'my_company',
        values: {
          companyName: '',
          address: '',
          zipCode: '',
          city: '',
          country: 'Maroc',
          state: '',
          phone: '',
          fax: '',
          email: '',
          website: '',
          logo: '',
          professions: '',
          vatNumber: '',
          ice: '',
          taxId: '',
          registrationNumber: '',
          legalStructure: '',
          capital: 0,
          fiscalYearStartMonth: 1,
        },
      });
    }

    // Create inventory entity with defaults if it doesn't exist
    if (!config && entity === 'inventory') {
      config = await this.create({
        entity: 'inventory',
        values: {
          defaultWarehouseId: null,
          incrementStockOnInvoiceAchat: false,
          decrementStockOnInvoiceVente: false,
          incrementStockOnOrderAchat: false,
          decrementStockOnOrderVente: false,
        },
      });
    }

    if (!config) {
      throw new NotFoundException(`Configuration "${entity}" not found`);
    }
    await this.cacheManager.set(cacheKey, config, 300_000);
    return config;
  }

  async create(createDto: CreateConfigurationDto): Promise<Configuration> {
    // Check if entity already exists
    const existing = await this.configRepository.findOne({
      where: { entity: createDto.entity },
    });

    if (existing) {
      throw new ConflictException(
        `Configuration "${createDto.entity}" already exists`,
      );
    }

    const config = this.configRepository.create(createDto);
    const saved = await this.configRepository.save(config);
    await this.invalidateCache(createDto.entity);
    return saved;
  }

  async update(
    id: number,
    updateDto: UpdateConfigurationDto,
  ): Promise<Configuration> {
    const config = await this.findOne(id);

    // Check if entity name is being changed and already exists
    if (updateDto.entity && updateDto.entity !== config.entity) {
      const existing = await this.configRepository.findOne({
        where: { entity: updateDto.entity },
      });

      if (existing) {
        throw new ConflictException(
          `Configuration "${updateDto.entity}" already exists`,
        );
      }
    }

    Object.assign(config, updateDto);
    const saved = await this.configRepository.save(config);
    await this.invalidateCache(config.entity);
    if (updateDto.entity && updateDto.entity !== config.entity) {
      await this.invalidateCache(updateDto.entity);
    }
    return saved;
  }

  async delete(id: number): Promise<void> {
    const config = await this.findOne(id);
    await this.configRepository.remove(config);
    await this.invalidateCache(config.entity);
  }

  private async invalidateCache(entity?: string): Promise<void> {
    await this.cacheManager.del('configurations:all');
    if (entity) {
      await this.cacheManager.del(`configurations:entity:${entity}`);
    }
  }
}
