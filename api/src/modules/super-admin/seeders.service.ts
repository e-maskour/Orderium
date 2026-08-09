import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SeederRunLog, SeederOperation } from './entities/seeder-log.entity';
import { Tenant } from '../tenant/tenant.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { SEEDERS, getSeeder } from '../../database/seeders/registry';
import {
  SeederDefinition,
  SeederOptionDef,
  SeederOptions,
} from '../../database/seeders/seeder.types';

export interface SeederCatalogueEntry {
  key: string;
  name: string;
  description: string;
  privileged: boolean;
  options: SeederOptionDef[];
}

export type SeederHealth = 'converged' | 'pending' | 'error';

export interface SeederStatusInfo {
  key: string;
  name: string;
  description: string;
  privileged: boolean;
  options: SeederOptionDef[];
  status: SeederHealth;
  /** Declared items absent from this tenant. Meaningless when status is error. */
  missing: number;
  detail: string;
  lastRunAt: string | null;
}

export interface TenantSeederStatus {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  health: SeederHealth;
  pendingCount: number;
  convergedCount: number;
  errorCount: number;
  totalCount: number;
  seeders: SeederStatusInfo[];
  lastFailedLog: SeederRunLog | null;
}

export interface FleetRunResult {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  status: 'success' | 'failed' | 'skipped';
  created: number;
  pruned: number;
  detail: string | null;
  durationMs: number;
  errorMessage: string | null;
}

interface LastRunRow {
  tenantId: number;
  seederKey: string;
  executedAt: Date;
}

@Injectable()
export class SeedersService {
  private readonly logger = new Logger(SeedersService.name);

  constructor(
    @InjectRepository(SeederRunLog, 'master')
    private readonly logRepo: Repository<SeederRunLog>,

    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,

    private readonly tenantConnService: TenantConnectionService,
  ) {}

  // ── Catalogue ─────────────────────────────────────────────────────────────

  getCatalogue(): SeederCatalogueEntry[] {
    return SEEDERS.map((s) => this.describe(s));
  }

  private describe(s: SeederDefinition): SeederCatalogueEntry {
    return {
      key: s.key,
      name: s.name,
      description: s.description,
      privileged: s.privileged === true,
      options: s.options ?? [],
    };
  }

  // ── Status ────────────────────────────────────────────────────────────────

  async getAllTenantsStatus(): Promise<TenantSeederStatus[]> {
    const tenants = await this.tenantRepo.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    // One query for every tenant's per-seeder last-run time, rather than one
    // per tenant per seeder.
    const lastRuns = await this.lastRunIndex();

    const results = await Promise.allSettled(
      tenants.map((t) => this.buildStatus(t, lastRuns)),
    );

    return results.map((result, idx) => {
      if (result.status === 'fulfilled') return result.value;
      const t = tenants[idx];
      this.logger.warn(
        `Could not read seeder status for tenant ${t.slug}: ${(result.reason as Error).message}`,
      );
      return this.unreachableTenantStatus(t, (result.reason as Error).message);
    });
  }

  async getTenantStatusById(tenantId: number): Promise<TenantSeederStatus> {
    const tenant = await this.requireTenant(tenantId);
    return this.buildStatus(tenant, await this.lastRunIndex(tenant.id));
  }

  private async lastRunIndex(tenantId?: number): Promise<Map<string, string>> {
    const rows: LastRunRow[] = await this.logRepo.query(
      `SELECT DISTINCT ON ("tenantId", "seederKey")
              "tenantId", "seederKey", "executed_at" AS "executedAt"
         FROM "seeder_run_logs"
        WHERE "status" = 'success'
          ${tenantId ? 'AND "tenantId" = $1' : ''}
        ORDER BY "tenantId", "seederKey", "executed_at" DESC`,
      tenantId ? [tenantId] : [],
    );

    const index = new Map<string, string>();
    for (const row of rows) {
      index.set(
        `${row.tenantId}:${row.seederKey}`,
        new Date(row.executedAt).toISOString(),
      );
    }
    return index;
  }

  private async buildStatus(
    tenant: Tenant,
    lastRuns: Map<string, string>,
  ): Promise<TenantSeederStatus> {
    const ds = await this.tenantConnService.getConnection(tenant.slug);

    const seeders: SeederStatusInfo[] = [];
    for (const seeder of SEEDERS) {
      const base = {
        ...this.describe(seeder),
        lastRunAt: lastRuns.get(`${tenant.id}:${seeder.key}`) ?? null,
      };

      try {
        const check = await seeder.check(ds.manager);
        seeders.push({
          ...base,
          status: check.missing > 0 ? 'pending' : 'converged',
          missing: check.missing,
          detail: check.detail,
        });
      } catch (err) {
        // Usually a missing table: the tenant has not run the migration that
        // creates what this seeder populates. Reported per seeder so one
        // unmigrated table does not blank out the whole tenant.
        seeders.push({
          ...base,
          status: 'error',
          missing: 0,
          detail: (err as Error).message,
        });
      }
    }

    const pendingCount = seeders.filter((s) => s.status === 'pending').length;
    const errorCount = seeders.filter((s) => s.status === 'error').length;
    const convergedCount = seeders.filter(
      (s) => s.status === 'converged',
    ).length;

    const lastFailedLog = await this.logRepo.findOne({
      where: { tenantId: tenant.id, status: 'failed' },
      order: { executedAt: 'DESC' },
    });

    let health: SeederHealth = 'converged';
    if (errorCount > 0) health = 'error';
    else if (pendingCount > 0) health = 'pending';

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      health,
      pendingCount,
      convergedCount,
      errorCount,
      totalCount: seeders.length,
      seeders,
      lastFailedLog: lastFailedLog ?? null,
    };
  }

  private unreachableTenantStatus(
    tenant: Tenant,
    message: string,
  ): TenantSeederStatus {
    const seeders: SeederStatusInfo[] = SEEDERS.map((s) => ({
      ...this.describe(s),
      status: 'error' as const,
      missing: 0,
      detail: message,
      lastRunAt: null,
    }));

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      health: 'error',
      pendingCount: 0,
      convergedCount: 0,
      errorCount: seeders.length,
      totalCount: seeders.length,
      seeders,
      lastFailedLog: null,
    };
  }

  // ── Run ───────────────────────────────────────────────────────────────────

  async runSeederForTenant(
    tenantId: number,
    seederKey: string,
    options: SeederOptions = {},
  ): Promise<SeederRunLog> {
    const tenant = await this.requireTenant(tenantId);
    const seeder = this.requireSeeder(seederKey);
    this.assertOptions(seeder, options);
    return this.execute(tenant, seeder, options, 'run');
  }

  /**
   * Every pending seeder on one tenant.
   *
   * Privileged seeders are skipped unless the caller passes options for them
   * explicitly — a bulk button should never quietly create an admin account.
   */
  async runPendingForTenant(
    tenantId: number,
    optionsByKey: Record<string, SeederOptions> = {},
  ): Promise<SeederRunLog[]> {
    const tenant = await this.requireTenant(tenantId);
    const status = await this.buildStatus(
      tenant,
      await this.lastRunIndex(tenant.id),
    );

    const logs: SeederRunLog[] = [];
    for (const info of status.seeders) {
      if (info.status !== 'pending') continue;
      const seeder = this.requireSeeder(info.key);
      if (seeder.privileged && !optionsByKey[seeder.key]) continue;
      this.assertOptions(seeder, optionsByKey[seeder.key] ?? {});
      logs.push(
        await this.execute(
          tenant,
          seeder,
          optionsByKey[seeder.key] ?? {},
          'run-tenant',
        ),
      );
    }
    return logs;
  }

  /**
   * One seeder across every tenant — the "I changed the defaults, roll it out"
   * path. Privileged seeders are refused: their options carry credentials, and
   * one credential set shared across the fleet is exactly the hazard the
   * per-seeder options were introduced to remove.
   */
  async runSeederAcrossTenants(
    seederKey: string,
    options: SeederOptions = {},
  ): Promise<FleetRunResult[]> {
    const seeder = this.requireSeeder(seederKey);
    if (seeder.privileged) {
      throw new BadRequestException(
        `"${seeder.name}" must be run one tenant at a time — it needs credentials unique to each tenant.`,
      );
    }

    this.assertOptions(seeder, options);

    const tenants = await this.tenantRepo.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    const results: FleetRunResult[] = [];
    for (const tenant of tenants) {
      const log = await this.execute(tenant, seeder, options, 'run-fleet');
      results.push({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        status: log.status,
        created: log.created,
        pruned: log.pruned,
        detail: log.detail,
        durationMs: log.durationMs ?? 0,
        errorMessage: log.errorMessage,
      });
    }
    return results;
  }

  // ── Logs ──────────────────────────────────────────────────────────────────

  async getLogs(
    opts: {
      limit?: number;
      tenantId?: number;
      seederKey?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {},
  ): Promise<SeederRunLog[]> {
    const { limit = 50, tenantId, seederKey, status, from, to } = opts;
    const qb = this.logRepo
      .createQueryBuilder('log')
      .orderBy('log.executedAt', 'DESC')
      .take(limit);

    if (tenantId) qb.andWhere('log.tenantId = :tenantId', { tenantId });
    if (seederKey) qb.andWhere('log.seederKey = :seederKey', { seederKey });
    if (status) qb.andWhere('log.status = :status', { status });
    if (from) qb.andWhere('log.executedAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('log.executedAt <= :to', { to: new Date(to) });

    return qb.getMany();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async execute(
    tenant: Tenant,
    seeder: SeederDefinition,
    options: SeederOptions,
    operation: SeederOperation,
  ): Promise<SeederRunLog> {
    const start = Date.now();
    const log = this.logRepo.create({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      seederKey: seeder.key,
      seederName: seeder.name,
      operation,
      status: 'success',
      created: 0,
      pruned: 0,
      // Keys only. Option values can be passwords.
      optionsUsed: Object.keys(options ?? {}),
      detail: null,
      errorMessage: null,
      durationMs: null,
    });

    let ds: DataSource;
    try {
      ds = await this.tenantConnService.getConnection(tenant.slug);
    } catch (err) {
      log.status = 'failed';
      log.errorMessage = `Could not connect to tenant database: ${(err as Error).message}`;
      log.durationMs = Date.now() - start;
      return this.logRepo.save(log);
    }

    // One transaction per seeder: a tenant either takes the whole seeder or
    // none of it, so a mid-run failure cannot leave half a catalogue behind.
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const result = await seeder.run(qr.manager, options);
      await qr.commitTransaction();

      log.created = result.created;
      log.pruned = result.pruned;
      log.detail = result.detail;
      log.durationMs = Date.now() - start;
      this.logger.log(
        `Seeder "${seeder.key}" ran on ${tenant.slug}: ${result.detail}`,
      );
    } catch (err) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction().catch(() => undefined);
      }
      log.status = 'failed';
      log.errorMessage = (err as Error).message;
      log.durationMs = Date.now() - start;
      this.logger.error(
        `Seeder "${seeder.key}" failed on ${tenant.slug}: ${(err as Error).message}`,
      );
    } finally {
      await qr.release();
    }

    return this.logRepo.save(log);
  }

  private async requireTenant(tenantId: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant #${tenantId} not found`);
    return tenant;
  }

  /**
   * Rejects missing or too-short required options before anything is written,
   * so a typo returns a 400 rather than a failed row in the audit trail.
   */
  private assertOptions(
    seeder: SeederDefinition,
    options: SeederOptions,
  ): void {
    for (const def of seeder.options ?? []) {
      if (!def.required) continue;

      const raw = options?.[def.key];
      const value = typeof raw === 'string' ? raw.trim() : raw;

      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(
          `"${def.label}" is required to run ${seeder.name}.`,
        );
      }
      if (
        def.minLength &&
        typeof value === 'string' &&
        value.length < def.minLength
      ) {
        throw new BadRequestException(
          `"${def.label}" must be at least ${def.minLength} characters.`,
        );
      }
    }
  }

  private requireSeeder(key: string): SeederDefinition {
    const seeder = getSeeder(key);
    if (!seeder) throw new NotFoundException(`Unknown seeder "${key}"`);
    return seeder;
  }
}
