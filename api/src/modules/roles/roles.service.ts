import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly permissionsService: PermissionsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get repo(): Repository<Role> {
    return this.tenantConnService.getRepository(Role);
  }

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private rolesKey(suffix: string): string {
    return `tenant:${this.tenantSlug}:roles:${suffix}`;
  }

  private async invalidateRolesCache(id?: number): Promise<void> {
    await this.cacheManager.del(this.rolesKey('all'));
    if (id) await this.cacheManager.del(this.rolesKey(`${id}`));
  }

  async findAll(): Promise<Role[]> {
    const key = this.rolesKey('all');
    const cached = await this.cacheManager.get<Role[]>(key);
    if (cached) return cached;

    const roles = await this.repo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
    await this.cacheManager.set(key, roles, 300_000);
    return roles;
  }

  async findOne(id: number): Promise<Role> {
    const key = this.rolesKey(`${id}`);
    const cached = await this.cacheManager.get<Role>(key);
    if (cached) return cached;

    const role = await this.repo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    await this.cacheManager.set(key, role, 300_000);
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing)
      throw new ConflictException(`Role "${dto.name}" already exists`);

    const permissions = dto.permissionIds?.length
      ? await Promise.all(
          dto.permissionIds.map((id) => this.permissionsService.findOne(id)),
        )
      : [];

    const role = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      isSuperAdmin: dto.isSuperAdmin ?? false,
      permissions,
    });

    const saved = await this.repo.save(role);
    await this.invalidateRolesCache();
    return saved;
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (dto.name && dto.name !== role.name) {
      const existing = await this.repo.findOne({ where: { name: dto.name } });
      if (existing)
        throw new ConflictException(`Role "${dto.name}" already exists`);
    }

    if (dto.permissionIds !== undefined) {
      role.permissions = dto.permissionIds.length
        ? await Promise.all(
            dto.permissionIds.map((pid) =>
              this.permissionsService.findOne(pid),
            ),
          )
        : [];
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined)
      role.description = dto.description ?? null;
    if (dto.isSuperAdmin !== undefined) role.isSuperAdmin = dto.isSuperAdmin;

    const saved = await this.repo.save(role);
    await this.invalidateRolesCache(id);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSuperAdmin) {
      throw new ConflictException('Cannot delete the super_admin role');
    }
    await this.repo.remove(role);
    await this.invalidateRolesCache(id);
  }

  /** Seed default super_admin role */
  async seedDefaults(): Promise<Role> {
    const existing = await this.repo.findOne({
      where: { name: 'super_admin' },
    });
    if (existing) return existing;
    return this.repo.save(
      this.repo.create({
        name: 'super_admin',
        description: 'Full access — bypasses all permission checks',
        isSuperAdmin: true,
        permissions: [],
      }),
    );
  }
}
