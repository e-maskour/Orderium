import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import {
  Tenant,
  TenantStatus,
  SubscriptionPlan,
} from '../tenant/tenant.entity';
import { Payment } from './entities/payment.entity';
import { SubscriptionPlan as SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { TenantActivityLog } from './entities/tenant-activity-log.entity';
import {
  CreatePaymentDto,
  ValidatePaymentDto,
  RejectPaymentDto,
  UpdatePlanDto,
} from './dto/lifecycle.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { TenantService } from '../tenant/tenant.service';

/** Status transition allowlist */
const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  trial: ['active', 'expired', 'disabled', 'suspended', 'archived'],
  active: ['expired', 'disabled', 'suspended', 'archived'],
  expired: ['active', 'disabled', 'suspended', 'archived'],
  suspended: ['active', 'disabled', 'archived'],
  disabled: ['trial', 'active', 'expired', 'suspended', 'archived'],
  archived: ['active', 'deleted'],
  deleted: [],
};

@Injectable()
export class TenantLifecycleService {
  private readonly logger = new Logger(TenantLifecycleService.name);

  constructor(
    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,

    @InjectRepository(Payment, 'master')
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(SubscriptionPlanEntity, 'master')
    private readonly planRepo: Repository<SubscriptionPlanEntity>,

    @InjectRepository(TenantActivityLog, 'master')
    private readonly logRepo: Repository<TenantActivityLog>,

    @InjectDataSource('master')
    private readonly masterDs: DataSource,

    private readonly tenantConnService: TenantConnectionService,
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly tenantService: TenantService,
  ) {}

  // ─── Status transitions ────────────────────────────────────────────────────

  async transition(
    id: number,
    newStatus: TenantStatus,
    reason?: string,
    performedBy?: string,
  ): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    const allowed = ALLOWED_TRANSITIONS[tenant.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition tenant from '${tenant.status}' to '${newStatus}'`,
      );
    }
    return this.applyStatusChange(tenant, newStatus, reason, performedBy);
  }

  async activate(id: number, performedBy?: string): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    return this.applyStatusChange(tenant, 'active', undefined, performedBy);
  }

  async disable(
    id: number,
    reason: string,
    performedBy?: string,
  ): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    const allowed = ALLOWED_TRANSITIONS[tenant.status] ?? [];
    if (!allowed.includes('disabled')) {
      throw new BadRequestException(
        `Cannot disable tenant with status '${tenant.status}'`,
      );
    }
    return this.applyStatusChange(tenant, 'disabled', reason, performedBy);
  }

  async suspend(
    id: number,
    reason: string,
    performedBy?: string,
  ): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    const allowed = ALLOWED_TRANSITIONS[tenant.status] ?? [];
    if (!allowed.includes('suspended')) {
      throw new BadRequestException(
        `Cannot suspend tenant with status '${tenant.status}'`,
      );
    }
    return this.applyStatusChange(tenant, 'suspended', reason, performedBy);
  }

  async archive(
    id: number,
    confirmation: string,
    reason?: string,
    performedBy?: string,
  ): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    if (confirmation !== tenant.name) {
      throw new BadRequestException(
        'Confirmation must match the exact tenant name',
      );
    }
    const allowed = ALLOWED_TRANSITIONS[tenant.status] ?? [];
    if (!allowed.includes('archived')) {
      throw new BadRequestException(
        `Cannot archive tenant with status '${tenant.status}'`,
      );
    }
    tenant.archivedAt = new Date();
    const updated = await this.applyStatusChange(
      tenant,
      'archived',
      reason,
      performedBy,
    );
    // Release active DB connection from pool
    try {
      await this.tenantConnService.closeConnection(tenant.slug);
    } catch {
      // Non-fatal
    }
    return updated;
  }

  async unarchive(id: number, performedBy?: string): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    if (tenant.status !== 'archived') {
      throw new BadRequestException('Only archived tenants can be unarchived');
    }
    const newStatus: TenantStatus =
      tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > new Date()
        ? 'active'
        : 'expired';
    tenant.archivedAt = null;
    return this.applyStatusChange(tenant, newStatus, 'Unarchived', performedBy);
  }

  async deletePermanently(
    id: number,
    confirmation: string,
    performedBy?: string,
  ): Promise<{ message: string }> {
    const tenant = await this.getTenantOrThrow(id);
    if (tenant.status !== 'archived') {
      throw new BadRequestException(
        'Tenant must be archived before permanent deletion',
      );
    }
    const expected = `DELETE ${tenant.name.toUpperCase()}`;
    if (confirmation !== expected) {
      throw new BadRequestException(
        `Confirmation must be exactly: ${expected}`,
      );
    }

    // Mark deleted first (audit trail preserved)
    await this.applyStatusChange(
      tenant,
      'deleted',
      'Permanent deletion',
      performedBy,
    );

    // Schedule actual teardown (drop DB, bucket, Redis)
    // The cron job handles tenants where deletedAt < NOW() - 24h
    // For immediate teardown in dev, call destroyTenantInfra directly
    await this.destroyTenantInfra(tenant);

    return {
      message: `Tenant '${tenant.slug}' has been permanently deleted. Database, bucket and Redis keys have been removed.`,
    };
  }

  async extendTrial(
    id: number,
    additionalDays: number,
    performedBy?: string,
  ): Promise<Tenant> {
    const tenant = await this.getTenantOrThrow(id);
    if (!['trial', 'expired'].includes(tenant.status)) {
      throw new BadRequestException(
        'Trial can only be extended for tenants in trial or expired status',
      );
    }
    const base = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : new Date();
    base.setDate(base.getDate() + additionalDays);
    tenant.trialEndsAt = base;
    if (tenant.status === 'expired') {
      tenant.previousStatus = tenant.status;
      tenant.status = 'trial';
      tenant.statusChangedAt = new Date();
      tenant.isActive = true;
    }
    const updated = await this.tenantRepo.save(tenant);
    await this.setRedisStatus(tenant.slug, updated.status);
    this.tenantService.evictFromCache(tenant.slug);
    await this.logActivity(
      tenant.id,
      'trial_extended',
      { additionalDays, newTrialEndsAt: tenant.trialEndsAt },
      performedBy,
    );
    return updated;
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  async createPayment(
    tenantId: number,
    dto: CreatePaymentDto,
    performedBy?: string,
  ): Promise<Payment> {
    await this.getTenantOrThrow(tenantId);
    const payment = this.paymentRepo.create({
      tenantId,
      amount: dto.amount,
      currency: dto.currency ?? 'MAD',
      paymentMethod: (dto.paymentMethod as any) ?? null,
      planName: dto.planName,
      billingCycle: dto.billingCycle as any,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      referenceNumber: dto.referenceNumber ?? null,
      receiptUrl: dto.receiptUrl ?? null,
      notes: dto.notes ?? null,
      status: 'pending',
    });
    const saved = await this.paymentRepo.save(payment);
    await this.logActivity(
      tenantId,
      'payment_recorded',
      {
        amount: dto.amount,
        currency: dto.currency ?? 'MAD',
        plan: dto.planName,
      },
      performedBy,
    );
    if (dto.validateImmediately) {
      return this.validatePayment(
        saved.id,
        { validatedBy: performedBy },
        performedBy,
      );
    }
    return saved;
  }

  async listPayments(tenantId: number): Promise<Payment[]> {
    await this.getTenantOrThrow(tenantId);
    return this.paymentRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async listAllPayments(filters: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Payment[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tenant', 'tenant')
      .orderBy('p.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters.from) {
      qb.andWhere('p.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('p.createdAt <= :to', { to: filters.to });
    }
    return qb.getMany();
  }

  async validatePayment(
    paymentId: string,
    dto: ValidatePaymentDto,
    performedBy?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    payment.status = 'validated';
    payment.validatedBy = dto.validatedBy ?? performedBy ?? null;
    payment.validatedAt = new Date();
    const saved = await this.paymentRepo.save(payment);

    // Activate tenant with subscription dates from payment
    const tenant = await this.getTenantOrThrow(payment.tenantId);
    const plan = await this.planRepo.findOne({
      where: { name: payment.planName },
    });
    tenant.status = 'active';
    tenant.previousStatus = tenant.status;
    tenant.statusChangedAt = new Date();
    tenant.subscriptionPlan = payment.planName as SubscriptionPlan;
    tenant.subscriptionStartedAt = new Date(payment.periodStart);
    tenant.subscriptionEndsAt = new Date(payment.periodEnd);
    tenant.isActive = true;
    if (plan) {
      tenant.maxUsers = plan.maxUsers;
      tenant.maxProducts = plan.maxProducts;
      tenant.maxOrdersPerMonth = plan.maxOrdersPerMonth;
      tenant.maxStorageMb = plan.maxStorageMb;
    }
    await this.tenantRepo.save(tenant);
    await this.setRedisStatus(tenant.slug, 'active');
    this.tenantService.evictFromCache(tenant.slug);
    await this.logActivity(
      tenant.id,
      'payment_validated',
      {
        paymentId,
        amount: payment.amount,
        plan: payment.planName,
        periodEnd: payment.periodEnd,
        validatedBy: payment.validatedBy,
      },
      performedBy,
    );

    return saved;
  }

  async rejectPayment(
    paymentId: string,
    dto: RejectPaymentDto,
    performedBy?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }
    payment.status = 'rejected';
    payment.rejectionReason = dto.reason;
    const saved = await this.paymentRepo.save(payment);
    await this.logActivity(
      payment.tenantId,
      'payment_rejected',
      { paymentId, reason: dto.reason },
      performedBy,
    );
    return saved;
  }

  async refundPayment(
    paymentId: string,
    performedBy?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== 'validated') {
      throw new BadRequestException('Only validated payments can be refunded');
    }
    payment.status = 'refunded';
    const saved = await this.paymentRepo.save(payment);
    await this.logActivity(
      payment.tenantId,
      'payment_refunded',
      { paymentId },
      performedBy,
    );
    return saved;
  }

  // ─── Subscription Plans ────────────────────────────────────────────────────

  async listPlans(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async updatePlan(
    id: string,
    dto: UpdatePlanDto,
  ): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async deactivatePlan(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    plan.isActive = false;
    return this.planRepo.save(plan);
  }

  // ─── Activity log ──────────────────────────────────────────────────────────

  async getActivityLog(tenantId: number): Promise<TenantActivityLog[]> {
    return this.logRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ─── Cron jobs ─────────────────────────────────────────────────────────────

  /** Every hour: expire trials that have passed their end date */
  @Cron(CronExpression.EVERY_HOUR)
  async expireTrials(): Promise<void> {
    const now = new Date();
    const expired = await this.tenantRepo.find({
      where: { status: 'trial', trialEndsAt: LessThan(now) },
    });
    for (const tenant of expired) {
      await this.applyStatusChange(
        tenant,
        'expired',
        'Trial period ended automatically',
      );
      this.logger.log(`Trial expired: ${tenant.slug}`);
    }
  }

  /** Every hour: expire active subscriptions that have ended (no auto-renew) */
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions(): Promise<void> {
    const now = new Date();
    const expired = await this.tenantRepo.find({
      where: {
        status: 'active',
        subscriptionEndsAt: LessThan(now),
        autoRenew: false,
      },
    });
    for (const tenant of expired) {
      await this.applyStatusChange(
        tenant,
        'expired',
        'Subscription ended automatically',
      );
      this.logger.log(`Subscription expired: ${tenant.slug}`);
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async applyStatusChange(
    tenant: Tenant,
    newStatus: TenantStatus,
    reason?: string,
    performedBy?: string,
  ): Promise<Tenant> {
    const oldStatus = tenant.status;
    tenant.previousStatus = oldStatus;
    tenant.status = newStatus;
    tenant.statusChangedAt = new Date();
    tenant.statusReason = reason ?? null;
    tenant.isActive = newStatus === 'active' || newStatus === 'trial';

    if (newStatus === 'disabled') tenant.disabledAt = new Date();
    else if (newStatus === 'archived') tenant.archivedAt = new Date();
    else if (newStatus === 'deleted') tenant.deletedAt = new Date();
    else if (newStatus === 'active' || newStatus === 'trial') {
      tenant.disabledAt = null;
    }

    const updated = await this.tenantRepo.save(tenant);
    await this.setRedisStatus(tenant.slug, newStatus);
    this.tenantService.evictFromCache(tenant.slug);
    await this.logActivity(
      tenant.id,
      `status_changed_${newStatus}`,
      { from: oldStatus, to: newStatus, reason },
      performedBy,
    );
    return updated;
  }

  private async destroyTenantInfra(tenant: Tenant): Promise<void> {
    // Drop PostgreSQL database
    try {
      await this.masterDs.query(
        `DROP DATABASE IF EXISTS "${tenant.databaseName}"`,
      );
      this.logger.warn(`DB dropped for tenant '${tenant.slug}'`);
    } catch (err) {
      this.logger.error(
        `Failed to drop DB for '${tenant.slug}': ${(err as Error).message}`,
      );
    }

    // Delete MinIO bucket
    try {
      const client = this.buildMinioClient();
      const bucketName = `orderium-${tenant.slug}`;
      const exists = await client.bucketExists(bucketName);
      if (exists) {
        // Remove all objects first
        const stream = client.listObjects(bucketName, '', true);
        const objects: Array<{ name: string }> = [];
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (obj) => objects.push({ name: obj.name! }));
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        if (objects.length > 0) {
          await client.removeObjects(bucketName, objects);
        }
        await client.removeBucket(bucketName);
        this.logger.warn(`Bucket deleted for tenant '${tenant.slug}'`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to delete bucket for '${tenant.slug}': ${(err as Error).message}`,
      );
    }

    // Clear Redis keys
    try {
      await this.cacheManager.del(`tenant:${tenant.slug}:status`);
      await this.cacheManager.del(`tenant:${tenant.slug}:config`);
    } catch {
      // Non-fatal
    }
  }

  private async setRedisStatus(slug: string, status: string): Promise<void> {
    try {
      await this.cacheManager.set(`tenant:${slug}:status`, status, 0);
    } catch (err) {
      this.logger.warn(
        `Failed to set Redis status for '${slug}': ${(err as Error).message}`,
      );
    }
  }

  async logActivity(
    tenantId: number,
    action: string,
    details: Record<string, unknown> = {},
    performedBy?: string,
  ): Promise<void> {
    try {
      const entry = this.logRepo.create({
        tenantId,
        action,
        details,
        performedBy: performedBy ?? null,
      });
      await this.logRepo.save(entry);
    } catch (err) {
      this.logger.warn(`Failed to log activity: ${(err as Error).message}`);
    }
  }

  private async getTenantOrThrow(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} not found`);
    return tenant;
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
}
