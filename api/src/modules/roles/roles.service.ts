import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { AccessControlService } from '../access/access-control.service';
import { AccessSyncService } from '../access/access-sync.service';
import { Permission } from '../permissions/entities/permission.entity';
import { isKnownPermissionKey } from '../../common/access/access-modules';

const ROLE_RELATIONS = ['permissions', 'implies'];

@Injectable()
export class RolesService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly permissionsService: PermissionsService,
    private readonly accessControl: AccessControlService,
    private readonly accessSync: AccessSyncService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get repo(): Repository<Role> {
    return this.tenantConnService.getRepository(Role);
  }

  private get permissionRepo(): Repository<Permission> {
    return this.tenantConnService.getRepository(Permission);
  }

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private rolesKey(suffix: string): string {
    return `tenant:${this.tenantSlug}:roles:${suffix}`;
  }

  /**
   * Drop the role read-cache and, critically, the resolved-access cache: a
   * permission change has to reach users who are already signed in on their
   * very next request.
   */
  private async invalidateRolesCache(id?: number): Promise<void> {
    await this.cacheManager.del(this.rolesKey('all'));
    if (id) await this.cacheManager.del(this.rolesKey(`${id}`));
    await this.accessControl.invalidate();
  }

  async findAll(): Promise<Role[]> {
    const key = this.rolesKey('all');
    const cached = await this.cacheManager.get<Role[]>(key);
    if (cached) return cached;

    const roles = await this.repo.find({
      relations: ROLE_RELATIONS,
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
      relations: ROLE_RELATIONS,
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    await this.cacheManager.set(key, role, 300_000);
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing)
      throw new ConflictException(`Role "${dto.name}" already exists`);

    const role = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category ?? null,
      isSuperAdmin: dto.isSuperAdmin ?? false,
      isSystem: false,
      permissions: await this.resolvePermissions(dto),
      implies: await this.resolveImplied(dto.impliedRoleIds),
    });

    const saved = await this.repo.save(role);
    await this.invalidateRolesCache();
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.repo.findOne({
      where: { id },
      relations: ROLE_RELATIONS,
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);

    if (dto.name !== undefined && dto.name !== role.name) {
      if (role.isSystem) {
        throw new ConflictException(
          `"${role.name}" is a system role and cannot be renamed`,
        );
      }
      const existing = await this.repo.findOne({ where: { name: dto.name } });
      if (existing)
        throw new ConflictException(`Role "${dto.name}" already exists`);
      role.name = dto.name;
    }

    if (dto.permissionIds !== undefined || dto.permissionKeys !== undefined) {
      role.permissions = await this.resolvePermissions(dto);
    }

    if (dto.impliedRoleIds !== undefined) {
      const implied = await this.resolveImplied(dto.impliedRoleIds);
      await this.assertNoImplicationCycle(id, implied);
      role.implies = implied;
    }

    if (dto.description !== undefined)
      role.description = dto.description ?? null;
    if (dto.category !== undefined) role.category = dto.category ?? null;
    if (dto.isSuperAdmin !== undefined) {
      if (role.isSystem && role.isSuperAdmin && !dto.isSuperAdmin) {
        throw new ConflictException(
          `"${role.name}" is the system administrator role; its super-admin flag cannot be cleared`,
        );
      }
      role.isSuperAdmin = dto.isSuperAdmin;
    }

    await this.repo.save(role);
    await this.invalidateRolesCache(id);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ConflictException(
        `"${role.name}" is a system role and cannot be deleted`,
      );
    }
    if (role.isSuperAdmin) {
      throw new ConflictException('Cannot delete a super-admin role');
    }
    await this.repo.remove(role);
    await this.invalidateRolesCache(id);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * `permissionKeys` wins when both are supplied: the role matrix speaks in
   * keys, and keys survive a re-seed of the catalogue where IDs may not.
   */
  private async resolvePermissions(
    dto: CreateRoleDto | UpdateRoleDto,
  ): Promise<Permission[]> {
    if (dto.permissionKeys !== undefined) {
      const unknown = dto.permissionKeys.filter(
        (key) => !isKnownPermissionKey(key),
      );
      if (unknown.length) {
        throw new BadRequestException(
          `Unknown permission key(s): ${unknown.join(', ')}`,
        );
      }
      if (!dto.permissionKeys.length) return [];
      return this.permissionsService.findByKeys(dto.permissionKeys);
    }

    if (dto.permissionIds !== undefined) {
      if (!dto.permissionIds.length) return [];
      const found = await this.permissionRepo.find({
        where: { id: In(dto.permissionIds) },
      });
      if (found.length !== new Set(dto.permissionIds).size) {
        const missing = dto.permissionIds.filter(
          (id) => !found.some((p) => p.id === id),
        );
        throw new NotFoundException(
          `Permission(s) not found: ${missing.join(', ')}`,
        );
      }
      return found;
    }

    return [];
  }

  private async resolveImplied(ids?: number[]): Promise<Role[]> {
    if (!ids?.length) return [];
    const roles = await this.repo.find({ where: { id: In(ids) } });
    if (roles.length !== new Set(ids).size) {
      const missing = ids.filter((id) => !roles.some((r) => r.id === id));
      throw new NotFoundException(`Role(s) not found: ${missing.join(', ')}`);
    }
    return roles;
  }

  /**
   * Resolution tolerates cycles, but a cycle is always a configuration
   * mistake — reject it at the point of entry rather than letting it sit in
   * the graph confusing whoever reads the role tree next.
   */
  private async assertNoImplicationCycle(
    roleId: number,
    implied: Role[],
  ): Promise<void> {
    if (implied.some((r) => r.id === roleId)) {
      throw new BadRequestException('A role cannot imply itself');
    }

    const edges = await this.repo
      .createQueryBuilder()
      .select(['ri."roleId" AS "from"', 'ri."impliedRoleId" AS "to"'])
      .from('role_implications', 'ri')
      .getRawMany<{ from: number; to: number }>();

    const outgoing = new Map<number, number[]>();
    for (const edge of edges) {
      // Ignore the edges we are about to replace.
      if (Number(edge.from) === roleId) continue;
      const list = outgoing.get(Number(edge.from)) ?? [];
      list.push(Number(edge.to));
      outgoing.set(Number(edge.from), list);
    }
    outgoing.set(
      roleId,
      implied.map((r) => r.id),
    );

    const visited = new Set<number>();
    const queue = implied.map((r) => r.id);
    while (queue.length) {
      const current = queue.shift() as number;
      if (current === roleId) {
        throw new BadRequestException(
          'That implication would create a cycle in the role hierarchy',
        );
      }
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(outgoing.get(current) ?? []));
    }
  }

  /**
   * Seed the permission catalogue and the preset role ladder. Idempotent —
   * existing roles keep their tailored permission sets.
   */
  async seedDefaults(): Promise<Role[]> {
    await this.accessSync.sync();
    await this.invalidateRolesCache();
    return this.findAll();
  }
}
