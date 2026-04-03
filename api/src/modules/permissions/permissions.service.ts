import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { DEFAULT_PERMISSIONS } from './permissions.data';

export { DEFAULT_PERMISSIONS };

@Injectable()
export class PermissionsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get repo(): Repository<Permission> {
    return this.tenantConnService.getRepository(Permission);
  }

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private permsKey(suffix: string): string {
    return `tenant:${this.tenantSlug}:permissions:${suffix}`;
  }

  private async invalidatePermissionsCache(id?: number): Promise<void> {
    await this.cacheManager.del(this.permsKey('all'));
    if (id) await this.cacheManager.del(this.permsKey(`${id}`));
  }

  async findAll(): Promise<Permission[]> {
    const key = this.permsKey('all');
    const cached = await this.cacheManager.get<Permission[]>(key);
    if (cached) return cached;

    const perms = await this.repo.find({
      order: { module: 'ASC', action: 'ASC' },
    });
    // Permissions are very stable — cache for 10 min
    await this.cacheManager.set(key, perms, 600_000);
    return perms;
  }

  async findOne(id: number): Promise<Permission> {
    const key = this.permsKey(`${id}`);
    const cached = await this.cacheManager.get<Permission>(key);
    if (cached) return cached;

    const perm = await this.repo.findOne({ where: { id } });
    if (!perm) throw new NotFoundException(`Permission #${id} not found`);
    await this.cacheManager.set(key, perm, 600_000);
    return perm;
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { key } });
  }

  async findByKeys(keys: string[]): Promise<Permission[]> {
    if (!keys.length) return [];
    return this.repo
      .createQueryBuilder('p')
      .where('p.key IN (:...keys)', { keys })
      .getMany();
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.repo.findOne({ where: { key: dto.key } });
    if (existing)
      throw new ConflictException(`Permission key "${dto.key}" already exists`);
    const perm = this.repo.create(dto);
    const saved = await this.repo.save(perm);
    await this.invalidatePermissionsCache();
    return saved;
  }

  async update(id: number, dto: UpdatePermissionDto): Promise<Permission> {
    const perm = await this.findOne(id);
    if (dto.key && dto.key !== perm.key) {
      const existing = await this.repo.findOne({ where: { key: dto.key } });
      if (existing)
        throw new ConflictException(
          `Permission key "${dto.key}" already exists`,
        );
    }
    Object.assign(perm, dto);
    const saved = await this.repo.save(perm);
    await this.invalidatePermissionsCache(id);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const perm = await this.findOne(id);
    await this.repo.remove(perm);
    await this.invalidatePermissionsCache(id);
  }

  /** Seed default permissions if not already present */
  async seedDefaults(): Promise<void> {
    for (const def of DEFAULT_PERMISSIONS) {
      const existing = await this.repo.findOne({ where: { key: def.key } });
      if (!existing) {
        await this.repo.save(this.repo.create(def));
      }
    }
  }
}
