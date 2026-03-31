import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not } from 'typeorm';
import { MigrationRunLog } from './entities/migration-log.entity';
import { Tenant } from '../tenant/tenant.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

export interface MigrationInfo {
    name: string;
    timestamp: number;
    status: 'applied' | 'pending';
}

export interface TenantMigrationStatus {
    tenantId: number;
    tenantSlug: string;
    tenantName: string;
    health: 'up-to-date' | 'pending' | 'failed';
    pendingCount: number;
    appliedCount: number;
    totalCount: number;
    migrations: MigrationInfo[];
    lastFailedLog: MigrationRunLog | null;
}

export interface RunAllResult {
    tenantId: number;
    tenantSlug: string;
    tenantName: string;
    status: 'success' | 'failed' | 'skipped';
    migrationsRun: number;
    durationMs: number;
    errorMessage: string | null;
}

@Injectable()
export class MigrationsService {
    private readonly logger = new Logger(MigrationsService.name);

    constructor(
        @InjectRepository(MigrationRunLog, 'master')
        private readonly logRepo: Repository<MigrationRunLog>,

        @InjectRepository(Tenant, 'master')
        private readonly tenantRepo: Repository<Tenant>,

        @InjectDataSource('master')
        private readonly masterDs: DataSource,

        private readonly tenantConnService: TenantConnectionService,
    ) { }

    // ── Status ────────────────────────────────────────────────────────────────

    async getAllTenantsStatus(): Promise<TenantMigrationStatus[]> {
        const tenants = await this.tenantRepo.find({
            where: { deletedAt: IsNull() },
            order: { name: 'ASC' },
        });

        const results = await Promise.allSettled(
            tenants.map((t) => this.getTenantMigrationStatus(t)),
        );

        return results.map((result, idx) => {
            if (result.status === 'fulfilled') return result.value;
            const t = tenants[idx];
            this.logger.warn(
                `Could not get migration status for tenant ${t.slug}: ${(result.reason as Error).message}`,
            );
            return {
                tenantId: t.id,
                tenantSlug: t.slug,
                tenantName: t.name,
                health: 'failed' as const,
                pendingCount: 0,
                appliedCount: 0,
                totalCount: 0,
                migrations: [],
                lastFailedLog: null,
            };
        });
    }

    async getTenantMigrationStatusById(
        tenantId: number,
    ): Promise<TenantMigrationStatus> {
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException(`Tenant #${tenantId} not found`);
        return this.getTenantMigrationStatus(tenant);
    }

    private async getTenantMigrationStatus(
        tenant: Tenant,
    ): Promise<TenantMigrationStatus> {
        const ds = await this.tenantConnService.getConnection(tenant.slug);
        const qr = ds.createQueryRunner();

        try {
            let executedRows: { timestamp: string; name: string }[] = [];
            try {
                const hasTable = await qr.hasTable('migrations');
                if (hasTable) {
                    executedRows = await qr.query(
                        'SELECT timestamp, name FROM migrations ORDER BY timestamp ASC',
                    );
                }
            } catch (err) {
                this.logger.warn(
                    `Could not read migrations table for ${tenant.slug}: ${(err as Error).message}`,
                );
            }

            const executedNames = new Set(executedRows.map((r) => r.name));

            // TypeORM populates ds.migrations with instantiated MigrationInterface objects
            // after DataSource.initialize() — each has an explicit `name` property via
            // `name = 'ClassName1234567890000'` set in the migration class body.
            const allMigrationInstances: Array<{ name?: string }> =
                ds.migrations as unknown as Array<{ name?: string }>;

            const migrations: MigrationInfo[] = allMigrationInstances.map((m) => {
                const name: string = m.name ?? 'UnknownMigration';
                return {
                    name,
                    timestamp: this.extractTimestamp(name),
                    status: executedNames.has(name) ? 'applied' : 'pending',
                };
            });

            migrations.sort((a, b) => a.timestamp - b.timestamp);

            const pendingCount = migrations.filter((m) => m.status === 'pending').length;
            const appliedCount = migrations.filter((m) => m.status === 'applied').length;

            const lastFailedLog = await this.logRepo.findOne({
                where: { tenantId: tenant.id, status: 'failed' },
                order: { executedAt: 'DESC' },
            });

            let health: TenantMigrationStatus['health'];
            if (lastFailedLog && pendingCount > 0) {
                health = 'failed';
            } else if (pendingCount > 0) {
                health = 'pending';
            } else {
                health = 'up-to-date';
            }

            return {
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                tenantName: tenant.name,
                health,
                pendingCount,
                appliedCount,
                totalCount: migrations.length,
                migrations,
                lastFailedLog: lastFailedLog ?? null,
            };
        } finally {
            await qr.release();
        }
    }

    // ── Run ───────────────────────────────────────────────────────────────────

    async runMigrationsForTenant(tenantId: number): Promise<MigrationRunLog> {
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException(`Tenant #${tenantId} not found`);

        return this.executeRun(tenant, 'run');
    }

    async runMigrationsForAllTenants(): Promise<RunAllResult[]> {
        const tenants = await this.tenantRepo.find({
            where: { deletedAt: IsNull() },
            order: { name: 'ASC' },
        });

        const results: RunAllResult[] = [];
        for (const tenant of tenants) {
            const log = await this.executeRun(tenant, 'run-all');
            results.push({
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                tenantName: tenant.name,
                status: log.status,
                migrationsRun: log.migrationsExecuted?.length ?? 0,
                durationMs: log.durationMs ?? 0,
                errorMessage: log.errorMessage,
            });
        }
        return results;
    }

    // ── Revert ────────────────────────────────────────────────────────────────

    async revertLastMigrationForTenant(tenantId: number): Promise<MigrationRunLog> {
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException(`Tenant #${tenantId} not found`);

        const start = Date.now();
        const log = this.logRepo.create({
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            operation: 'revert',
            status: 'success',
            migrationsExecuted: null,
            errorMessage: null,
            durationMs: null,
        });

        try {
            const ds = await this.tenantConnService.getConnection(tenant.slug);

            // Capture the last applied migration name before reverting
            const qr = ds.createQueryRunner();
            let lastMigrationName: string | null = null;
            try {
                const rows: { name: string }[] = await qr.query(
                    'SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 1',
                );
                lastMigrationName = rows[0]?.name ?? null;
            } finally {
                await qr.release();
            }

            if (!lastMigrationName) {
                log.status = 'failed';
                log.errorMessage = 'No applied migrations to revert.';
                log.durationMs = Date.now() - start;
                return this.logRepo.save(log);
            }

            await ds.undoLastMigration({ transaction: 'all' });
            log.migrationsExecuted = [lastMigrationName];
            log.status = 'success';
            log.durationMs = Date.now() - start;
            this.logger.log(
                `Reverted migration "${lastMigrationName}" for tenant ${tenant.slug}`,
            );
        } catch (err) {
            log.status = 'failed';
            log.errorMessage = (err as Error).message;
            log.durationMs = Date.now() - start;
            this.logger.error(
                `Revert failed for tenant ${tenant.slug}: ${(err as Error).message}`,
            );
        }

        return this.logRepo.save(log);
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    async getLogs(opts: {
        limit?: number;
        tenantId?: number;
        status?: string;
        from?: string;
        to?: string;
    } = {}): Promise<MigrationRunLog[]> {
        const { limit = 50, tenantId, status, from, to } = opts;
        const qb = this.logRepo
            .createQueryBuilder('log')
            .orderBy('log.executedAt', 'DESC')
            .take(limit);

        if (tenantId) qb.andWhere('log.tenantId = :tenantId', { tenantId });
        if (status) qb.andWhere('log.status = :status', { status });
        if (from) qb.andWhere('log.executedAt >= :from', { from: new Date(from) });
        if (to) qb.andWhere('log.executedAt <= :to', { to: new Date(to) });

        return qb.getMany();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async executeRun(
        tenant: Tenant,
        operation: 'run' | 'run-all',
    ): Promise<MigrationRunLog> {
        const start = Date.now();
        const log = this.logRepo.create({
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            operation,
            status: 'success',
            migrationsExecuted: null,
            errorMessage: null,
            durationMs: null,
        });

        try {
            const ds = await this.tenantConnService.getConnection(tenant.slug);
            const ranMigrations = await ds.runMigrations({ transaction: 'all' });
            log.migrationsExecuted = ranMigrations.map(
                (m) => (m as unknown as { name?: string }).name ?? m.constructor.name,
            );
            log.status = 'success';
            log.durationMs = Date.now() - start;
            this.logger.log(
                `Ran ${ranMigrations.length} migration(s) for tenant ${tenant.slug}`,
            );
        } catch (err) {
            log.status = 'failed';
            log.errorMessage = (err as Error).message;
            log.durationMs = Date.now() - start;
            this.logger.error(
                `Migration run failed for tenant ${tenant.slug}: ${(err as Error).message}`,
            );
        }

        return this.logRepo.save(log);
    }

    private extractTimestamp(migrationName: string): number {
        const match = migrationName.match(/(\d{13})/);
        return match ? Number(match[1]) : 0;
    }
}
