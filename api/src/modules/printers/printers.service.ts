import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Printer } from './entities/printer.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Injectable()
export class PrintersService {
  private readonly CACHE_TTL = 60_000; // 60s in ms

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get repo(): Repository<Printer> {
    return this.tenantConnService.getRepository(Printer);
  }

  private get cacheKey(): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `printers:${slug}`;
  }

  async findAll(): Promise<Printer[]> {
    const cached = await this.cacheManager.get<Printer[]>(this.cacheKey);
    if (cached) return cached;

    const printers = await this.repo.find({
      where: { isEnabled: true },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    await this.cacheManager.set(this.cacheKey, printers, this.CACHE_TTL);
    return printers;
  }

  async findOne(id: string): Promise<Printer> {
    const printer = await this.repo.findOne({ where: { id } });
    if (!printer) throw new NotFoundException(`Imprimante ${id} introuvable`);
    return printer;
  }

  async create(dto: CreatePrinterDto): Promise<Printer> {
    if (['wifi', 'network'].includes(dto.connectionType) && !dto.ip) {
      throw new ConflictException(
        'Une adresse IP est requise pour les imprimantes WiFi/réseau',
      );
    }

    if (dto.isDefault) {
      await this.repo.update({ isDefault: true }, { isDefault: false });
    }

    const printer = this.repo.create(dto);
    const saved = await this.repo.save(printer);
    await this.invalidateCache();
    return saved;
  }

  async update(id: string, dto: UpdatePrinterDto): Promise<Printer> {
    const printer = await this.findOne(id);

    if (dto.isDefault) {
      await this.repo.update({ isDefault: true }, { isDefault: false });
    }

    Object.assign(printer, dto);
    const saved = await this.repo.save(printer);
    await this.invalidateCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const printer = await this.findOne(id);
    await this.repo.remove(printer);
    await this.invalidateCache();
  }

  async ping(id: string): Promise<void> {
    await this.repo.update({ id }, { lastSeenAt: new Date() });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.cacheKey);
  }
}
