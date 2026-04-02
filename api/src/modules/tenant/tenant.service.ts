import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { TenantConnectionService } from './tenant-connection.service';
import { runTenantSeeders } from '../../database/seeders';
import { runTenantInitScripts } from '../../database/init-scripts';
import { Payment } from '../tenant-lifecycle/entities/payment.entity';
import { TenantActivityLog } from '../tenant-lifecycle/entities/tenant-activity-log.entity';

export interface TenantUrls {
  admin: string;
  client: string;
  delivery: string;
}

export interface TenantStats {
  usersCount: number;
  ordersCount: number;
  dbSizeBytes: number;
  dbSizeHuman: string;
  storageUsedBytes: number;
  storageUsedHuman: string;
}

export interface PaginatedTenants {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * TenantService owns the CRUD lifecycle of tenants including:
 *  - In-memory slug → Tenant cache (hot path for every request)
 *  - PostgreSQL database provisioning on tenant creation
 *  - TypeORM migration execution on newly created databases
 *  - MinIO bucket creation per tenant
 *  - Redis namespace management (tenant:slug:status keys)
 */
@Injectable()
export class TenantService implements OnModuleInit {
  private readonly logger = new Logger(TenantService.name);

  /** In-memory cache populated at startup and kept in sync on mutations */
  private readonly cache = new Map<string, Tenant>();

  constructor(
    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,

    @InjectRepository(Payment, 'master')
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(TenantActivityLog, 'master')
    private readonly activityLogRepo: Repository<TenantActivityLog>,

    @InjectDataSource('master')
    private readonly masterDs: DataSource,

    private readonly tenantConnService: TenantConnectionService,
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) { }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    const all = await this.tenantRepo.find({
      where: { deletedAt: IsNull() },
    });
    for (const t of all) this.cache.set(t.slug, t);
    this.logger.log(`Loaded ${all.length} tenant(s) into cache`);

    // Re-apply bucket policies in the background so existing buckets created
    // with an older policy are corrected on startup without blocking boot.
    void Promise.allSettled(
      all.map((t) => this.provisionMinioBucket(t.slug)),
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        this.logger.warn(
          `MinIO bucket policy sync: ${failed}/${all.length} tenant(s) failed`,
        );
      } else {
        this.logger.log(
          `MinIO bucket policy sync complete for ${all.length} tenant(s)`,
        );
      }
    });
  }

  // ─── Read operations ───────────────────────────────────────────────────────

  async getActivity(tenantId: number): Promise<TenantActivityLog[]> {
    return this.activityLogRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getPayments(tenantId: number): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const cached = this.cache.get(slug);
    if (cached) return cached;

    const tenant = await this.tenantRepo.findOne({
      where: { slug },
    });
    if (tenant && !tenant.deletedAt && tenant.status !== 'deleted') {
      this.cache.set(slug, tenant);
    }
    return tenant ?? null;
  }

  /** Evict a tenant from the in-memory cache so the next lookup re-reads from DB. */
  evictFromCache(slug: string): void {
    this.cache.delete(slug);
  }

  /** Returns slug/id/name for all active (non-deleted) tenants. Used by cron jobs. */
  async getActiveTenantSlugs(): Promise<
    { slug: string; id: number; name: string }[]
  > {
    const tenants = await this.tenantRepo.find({
      where: { deletedAt: IsNull(), isActive: true },
      select: ['id', 'slug', 'name'],
    });
    return tenants.map((t) => ({ slug: t.slug, id: t.id, name: t.name }));
  }

  async findAll(dto: ListTenantsDto = {}): Promise<PaginatedTenants> {
    const {
      search,
      status = 'all',
      plan = 'all',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = dto;

    const qb = this.tenantRepo.createQueryBuilder('t');

    // Status filter — now using the `status` column
    if (status && status !== 'all') {
      qb.andWhere('t.status = :status', { status });
    }

    // Plan filter
    if (plan && plan !== 'all') {
      qb.andWhere('t.subscriptionPlan = :plan', { plan });
    }

    // Search filter (name or slug)
    if (search?.trim()) {
      qb.andWhere('(t.name ILIKE :search OR t.slug ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    // Sorting (allowlist to prevent injection)
    const allowedSort: Record<string, string> = {
      name: 't.name',
      createdAt: 't.createdAt',
      subscriptionPlan: 't.subscriptionPlan',
      status: 't.status',
    };
    const orderCol = allowedSort[sortBy] ?? 't.createdAt';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(orderCol, orderDir);

    // Pagination
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} not found`);
    return tenant;
  }

  // ─── Write operations ──────────────────────────────────────────────────────

  async create(dto: CreateTenantDto): Promise<Tenant & { urls: TenantUrls }> {
    const conflict = await this.tenantRepo.findOne({
      where: { slug: dto.slug },
    });
    if (conflict) {
      throw new ConflictException(`Slug '${dto.slug}' is already taken`);
    }

    const databaseName = `orderium_${dto.slug}`;

    // 1. Create the PostgreSQL database
    await this.provisionDatabase(databaseName, dto.slug);

    // 2. Create the MinIO bucket
    await this.provisionMinioBucket(dto.slug);

    // 3. Register the tenant in the master DB
    const tenant = this.tenantRepo.create({
      name: dto.name,
      slug: dto.slug,
      logoUrl: dto.logoUrl ?? null,
      primaryColor: dto.primaryColor ?? null,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
      subscriptionPlan: (dto.subscriptionPlan ?? 'trial') as any,
      maxUsers: dto.maxUsers ?? 5,
      settings: dto.settings ?? null,
      databaseName,
      databaseHost: this.configService.get<string>('DB_HOST') || 'localhost',
      databasePort: Number(this.configService.get('DB_PORT') ?? 5432),
      isActive: true,
      // status lifecycle
      status: (dto.trialDays === 0 ? 'active' : 'trial') as any,
      trialStartedAt: new Date(),
      trialDays: dto.trialDays ?? 30,
      trialEndsAt: dto.trialDays === 0
        ? null
        : new Date(Date.now() + (dto.trialDays ?? 30) * 24 * 60 * 60 * 1000),
    });
    const saved = await this.tenantRepo.save(tenant);
    this.cache.set(saved.slug, saved);

    // 4. Set Redis namespace
    await this.setTenantRedisStatus(saved.slug, saved.status);
    await this.cacheManager.set(
      `tenant:${saved.slug}:config`,
      {
        slug: saved.slug,
        plan: saved.subscriptionPlan,
        maxUsers: saved.maxUsers,
      },
      0, // no TTL — persistent config
    );

    this.logger.log(`Tenant '${saved.slug}' created successfully`);
    return { ...saved, urls: this.buildUrls(saved.slug) };
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, dto);
    const updated = await this.tenantRepo.save(tenant);
    if (updated.isActive && !updated.deletedAt) {
      this.cache.set(updated.slug, updated);
    }
    return updated;
  }

  async activate(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.deletedAt) {
      throw new BadRequestException('Cannot activate a deleted tenant');
    }
    tenant.isActive = true;
    tenant.disabledAt = null;
    const updated = await this.tenantRepo.save(tenant);
    this.cache.set(updated.slug, updated);
    await this.setTenantRedisStatus(updated.slug, 'active');
    this.logger.log(`Tenant '${updated.slug}' activated`);
    return updated;
  }

  async disable(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.deletedAt) {
      throw new BadRequestException('Cannot disable a deleted tenant');
    }
    tenant.isActive = false;
    tenant.disabledAt = new Date();
    const updated = await this.tenantRepo.save(tenant);
    this.cache.delete(updated.slug);
    await this.setTenantRedisStatus(updated.slug, 'disabled');
    this.logger.log(`Tenant '${updated.slug}' disabled`);
    return updated;
  }

  async softDelete(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.deletedAt = new Date();
    tenant.isActive = false;
    const updated = await this.tenantRepo.save(tenant);
    this.cache.delete(updated.slug);
    // Remove Redis keys for the tenant
    await this.clearTenantRedisKeys(updated.slug);
    this.logger.log(`Tenant '${updated.slug}' soft-deleted`);
    return updated;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats(id: number): Promise<TenantStats> {
    const tenant = await this.findOne(id);

    let usersCount = 0;
    let ordersCount = 0;
    let dbSizeBytes = 0;

    try {
      const ds = await this.tenantConnService.getConnection(tenant.slug);

      // Check table existence before querying (graceful if schema not yet seeded)
      const tables = await ds.query<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      );
      const tableNames = tables.map((r) => r.table_name);

      if (tableNames.includes('users')) {
        const [{ count }] = await ds.query<[{ count: string }]>(
          'SELECT COUNT(*) AS count FROM users',
        );
        usersCount = parseInt(count, 10);
      }

      if (tableNames.includes('orders')) {
        const [{ count }] = await ds.query<[{ count: string }]>(
          'SELECT COUNT(*) AS count FROM orders',
        );
        ordersCount = parseInt(count, 10);
      }

      const [{ size }] = await this.masterDs.query<[{ size: string }]>(
        `SELECT pg_database_size($1) AS size`,
        [tenant.databaseName],
      );
      dbSizeBytes = parseInt(size, 10);
    } catch (err) {
      this.logger.warn(
        `Could not fully gather stats for tenant '${tenant.slug}': ${(err as Error).message}`,
      );
    }

    let storageUsedBytes = 0;
    try {
      storageUsedBytes = await this.getMinioBucketSize(tenant.slug);
    } catch {
      // Non-fatal
    }

    return {
      usersCount,
      ordersCount,
      dbSizeBytes,
      dbSizeHuman: this.formatBytes(dbSizeBytes),
      storageUsedBytes,
      storageUsedHuman: this.formatBytes(storageUsedBytes),
    };
  }

  // ─── Reset ─────────────────────────────────────────────────────────────────

  async resetData(
    id: number,
    confirmation: string,
  ): Promise<{ message: string }> {
    if (confirmation !== 'RESET') {
      throw new BadRequestException(
        'Confirmation string must be exactly "RESET"',
      );
    }
    const tenant = await this.findOne(id);

    // Drop and re-create the tenant database
    await this.masterDs.query(
      `DROP DATABASE IF EXISTS "${tenant.databaseName}"`,
    );
    this.logger.warn(`Database dropped for tenant '${tenant.slug}'`);

    await this.provisionDatabase(tenant.databaseName, tenant.slug);

    return {
      message: `Tenant '${tenant.slug}' data has been reset. Fresh database provisioned.`,
    };
  }

  // ─── URL helpers ────────────────────────────────────────────────────────────

  buildUrls(slug: string): TenantUrls {
    const domain =
      this.configService.get<string>('TENANT_BASE_DOMAIN') || 'mar-nova.com';
    return {
      admin: `https://${slug}-admin.${domain}`,
      client: `https://${slug}-app.${domain}`,
      delivery: `https://${slug}-delivery.${domain}`,
    };
  }

  // ─── Provisioning helpers ──────────────────────────────────────────────────

  private async provisionDatabase(
    databaseName: string,
    tenantSlug: string,
  ): Promise<void> {
    try {
      await this.masterDs.query(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`Database created: ${databaseName}`);
    } catch (err: unknown) {
      const msg = (err as Error).message || '';
      if (!msg.includes('already exists')) {
        throw new InternalServerErrorException(
          `Failed to create database '${databaseName}': ${msg}`,
        );
      }
      this.logger.warn(
        `Database '${databaseName}' already exists — skipping creation`,
      );
    }

    const ds = await this.tenantConnService.getConnection(tenantSlug);
    const pending = await ds.showMigrations();
    if (pending) {
      await ds.runMigrations({ transaction: 'each' });
      this.logger.log(`Migrations applied to: ${databaseName}`);
    }

    await runTenantSeeders(ds);
    this.logger.log(`Seeders applied to: ${databaseName}`);

    await runTenantInitScripts(ds);
    this.logger.log(`Init scripts applied to: ${databaseName}`);
  }

  private async provisionMinioBucket(tenantSlug: string): Promise<void> {
    const bucketName = `orderium-${tenantSlug}`;
    const client = this.buildMinioClient();

    try {
      const exists = await client.bucketExists(bucketName);
      if (!exists) {
        await client.makeBucket(bucketName);
      }

      // Always (re-)apply the public-read policy so existing buckets are
      // corrected if the policy was changed. Write operations remain
      // authenticated; s3:ListBucket is intentionally NOT granted.
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      });
      await client.setBucketPolicy(bucketName, policy);
      this.logger.log(
        `MinIO bucket ready with public-read policy: ${bucketName}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to create MinIO bucket '${bucketName}': ${(err as Error).message}`,
      );
    }
  }

  private async getMinioBucketSize(tenantSlug: string): Promise<number> {
    const bucketName = `orderium-${tenantSlug}`;
    const client = this.buildMinioClient();
    let totalSize = 0;
    const stream = client.listObjects(bucketName, '', true);
    return new Promise((resolve) => {
      stream.on('data', (obj) => {
        totalSize += obj.size ?? 0;
      });
      stream.on('end', () => resolve(totalSize));
      stream.on('error', () => resolve(0));
    });
  }

  private buildMinioClient(): Minio.Client {
    return new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: Number(this.configService.get('MINIO_PORT') ?? 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey:
        this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey:
        this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });
  }

  // ─── Redis helpers ─────────────────────────────────────────────────────────

  private async setTenantRedisStatus(
    slug: string,
    status: string,
  ): Promise<void> {
    try {
      await this.cacheManager.set(`tenant:${slug}:status`, status, 0);
    } catch (err) {
      this.logger.warn(
        `Failed to set Redis status for tenant '${slug}': ${(err as Error).message}`,
      );
    }
  }

  private async clearTenantRedisKeys(slug: string): Promise<void> {
    try {
      await this.cacheManager.del(`tenant:${slug}:status`);
      await this.cacheManager.del(`tenant:${slug}:config`);
    } catch (err) {
      this.logger.warn(
        `Failed to clear Redis keys for tenant '${slug}': ${(err as Error).message}`,
      );
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
