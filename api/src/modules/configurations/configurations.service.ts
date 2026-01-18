import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './entities/configuration.entity';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationsService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepository: Repository<Configuration>,
  ) {}

  async findAll(): Promise<Configuration[]> {
    return this.configRepository.find({
      order: { entity: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Configuration> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Configuration with ID ${id} not found`);
    }
    return config;
  }

  async findByEntity(entity: string): Promise<Configuration> {
    let config = await this.configRepository.findOne({ where: { entity } });
    
    // Create sequences entity if it doesn't exist
    if (!config && entity === 'sequences') {
      config = await this.create({
        entity: 'sequences',
        values: { sequences: [] }
      });
    }
    
    if (!config) {
      throw new NotFoundException(`Configuration "${entity}" not found`);
    }
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
    return this.configRepository.save(config);
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
    return this.configRepository.save(config);
  }

  async delete(id: number): Promise<void> {
    const config = await this.findOne(id);
    await this.configRepository.remove(config);
  }
}
