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

/** Default permissions seeded for every tenant */
export const DEFAULT_PERMISSIONS: Omit<
  Permission,
  'id' | 'roles' | 'dateCreated' | 'dateUpdated'
>[] = [
  // ── Dashboard ──────────────────────────────────────────────
  {
    key: 'statistics.view',
    name: 'View Statistics',
    description: 'View dashboard statistics',
    module: 'statistics',
    action: 'view',
  },

  // ── Products ───────────────────────────────────────────────
  {
    key: 'products.view',
    name: 'View Products',
    description: 'List and view product details',
    module: 'products',
    action: 'view',
  },
  {
    key: 'products.create',
    name: 'Create Products',
    description: 'Create new products',
    module: 'products',
    action: 'create',
  },
  {
    key: 'products.edit',
    name: 'Edit Products',
    description: 'Edit existing products',
    module: 'products',
    action: 'edit',
  },
  {
    key: 'products.delete',
    name: 'Delete Products',
    description: 'Delete products',
    module: 'products',
    action: 'delete',
  },

  // ── Categories ─────────────────────────────────────────────
  {
    key: 'categories.view',
    name: 'View Categories',
    description: 'List and view categories',
    module: 'categories',
    action: 'view',
  },
  {
    key: 'categories.create',
    name: 'Create Categories',
    description: 'Create new categories',
    module: 'categories',
    action: 'create',
  },
  {
    key: 'categories.edit',
    name: 'Edit Categories',
    description: 'Edit categories',
    module: 'categories',
    action: 'edit',
  },
  {
    key: 'categories.delete',
    name: 'Delete Categories',
    description: 'Delete categories',
    module: 'categories',
    action: 'delete',
  },

  // ── Orders ─────────────────────────────────────────────────
  {
    key: 'orders.view',
    name: 'View Orders',
    description: 'List and view order details',
    module: 'orders',
    action: 'view',
  },
  {
    key: 'orders.create',
    name: 'Create Orders',
    description: 'Create new orders',
    module: 'orders',
    action: 'create',
  },
  {
    key: 'orders.edit',
    name: 'Edit Orders',
    description: 'Edit orders',
    module: 'orders',
    action: 'edit',
  },
  {
    key: 'orders.delete',
    name: 'Delete Orders',
    description: 'Delete orders',
    module: 'orders',
    action: 'delete',
  },

  // ── Invoices ───────────────────────────────────────────────
  {
    key: 'invoices.view',
    name: 'View Invoices',
    description: 'List and view invoices',
    module: 'invoices',
    action: 'view',
  },
  {
    key: 'invoices.create',
    name: 'Create Invoices',
    description: 'Create invoices',
    module: 'invoices',
    action: 'create',
  },
  {
    key: 'invoices.edit',
    name: 'Edit Invoices',
    description: 'Edit invoices',
    module: 'invoices',
    action: 'edit',
  },
  {
    key: 'invoices.delete',
    name: 'Delete Invoices',
    description: 'Delete invoices',
    module: 'invoices',
    action: 'delete',
  },

  // ── Quotes ─────────────────────────────────────────────────
  {
    key: 'quotes.view',
    name: 'View Quotes',
    description: 'List and view quotes',
    module: 'quotes',
    action: 'view',
  },
  {
    key: 'quotes.create',
    name: 'Create Quotes',
    description: 'Create quotes',
    module: 'quotes',
    action: 'create',
  },
  {
    key: 'quotes.edit',
    name: 'Edit Quotes',
    description: 'Edit quotes',
    module: 'quotes',
    action: 'edit',
  },
  {
    key: 'quotes.delete',
    name: 'Delete Quotes',
    description: 'Delete quotes',
    module: 'quotes',
    action: 'delete',
  },

  // ── Partners (Customers / Suppliers) ───────────────────────
  {
    key: 'partners.view',
    name: 'View Partners',
    description: 'List and view partners',
    module: 'partners',
    action: 'view',
  },
  {
    key: 'partners.create',
    name: 'Create Partners',
    description: 'Create partners',
    module: 'partners',
    action: 'create',
  },
  {
    key: 'partners.edit',
    name: 'Edit Partners',
    description: 'Edit partners',
    module: 'partners',
    action: 'edit',
  },
  {
    key: 'partners.delete',
    name: 'Delete Partners',
    description: 'Delete partners',
    module: 'partners',
    action: 'delete',
  },

  // ── Payments ───────────────────────────────────────────────
  {
    key: 'payments.view',
    name: 'View Payments',
    description: 'List and view payments',
    module: 'payments',
    action: 'view',
  },
  {
    key: 'payments.create',
    name: 'Create Payments',
    description: 'Record payments',
    module: 'payments',
    action: 'create',
  },
  {
    key: 'payments.edit',
    name: 'Edit Payments',
    description: 'Edit payments',
    module: 'payments',
    action: 'edit',
  },
  {
    key: 'payments.delete',
    name: 'Delete Payments',
    description: 'Delete payments',
    module: 'payments',
    action: 'delete',
  },

  // ── Inventory ──────────────────────────────────────────────
  {
    key: 'inventory.view',
    name: 'View Inventory',
    description: 'View stock and inventory',
    module: 'inventory',
    action: 'view',
  },
  {
    key: 'inventory.manage',
    name: 'Manage Inventory',
    description: 'Adjust stock and manage warehouses',
    module: 'inventory',
    action: 'manage',
  },

  // ── Delivery ───────────────────────────────────────────────
  {
    key: 'delivery.view',
    name: 'View Delivery',
    description: 'View delivery persons and orders',
    module: 'delivery',
    action: 'view',
  },
  {
    key: 'delivery.manage',
    name: 'Manage Delivery',
    description: 'Manage delivery assignments',
    module: 'delivery',
    action: 'manage',
  },

  // ── Configurations ─────────────────────────────────────────
  {
    key: 'configurations.view',
    name: 'View Configurations',
    description: 'View system configurations',
    module: 'configurations',
    action: 'view',
  },
  {
    key: 'configurations.manage',
    name: 'Manage Configurations',
    description: 'Edit system configurations',
    module: 'configurations',
    action: 'manage',
  },

  // ── Drive ──────────────────────────────────────────────────
  {
    key: 'drive.view',
    name: 'View Drive',
    description: 'Access drive files',
    module: 'drive',
    action: 'view',
  },
  {
    key: 'drive.manage',
    name: 'Manage Drive',
    description: 'Upload and manage drive files',
    module: 'drive',
    action: 'manage',
  },

  // ── POS ────────────────────────────────────────────────────
  {
    key: 'pos.use',
    name: 'Use POS',
    description: 'Access Point of Sale',
    module: 'pos',
    action: 'use',
  },

  // ── Users ──────────────────────────────────────────────────
  {
    key: 'users.view',
    name: 'View Users',
    description: 'List and view users',
    module: 'users',
    action: 'view',
  },
  {
    key: 'users.create',
    name: 'Create Users',
    description: 'Create new users',
    module: 'users',
    action: 'create',
  },
  {
    key: 'users.edit',
    name: 'Edit Users',
    description: 'Edit users',
    module: 'users',
    action: 'edit',
  },
  {
    key: 'users.delete',
    name: 'Delete Users',
    description: 'Delete users',
    module: 'users',
    action: 'delete',
  },

  // ── Roles ──────────────────────────────────────────────────
  {
    key: 'roles.view',
    name: 'View Roles',
    description: 'List and view roles',
    module: 'roles',
    action: 'view',
  },
  {
    key: 'roles.create',
    name: 'Create Roles',
    description: 'Create roles',
    module: 'roles',
    action: 'create',
  },
  {
    key: 'roles.edit',
    name: 'Edit Roles',
    description: 'Edit roles and permissions',
    module: 'roles',
    action: 'edit',
  },
  {
    key: 'roles.delete',
    name: 'Delete Roles',
    description: 'Delete roles',
    module: 'roles',
    action: 'delete',
  },
];

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
