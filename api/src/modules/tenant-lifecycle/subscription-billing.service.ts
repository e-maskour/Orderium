import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  EntityManager,
  SelectQueryBuilder,
} from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import {
  Payment,
  PaymentStatus,
  PaymentWithBalance,
} from './entities/payment.entity';
import { PaymentInstallment } from './entities/payment-installment.entity';
import { SubscriptionPlan as SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  VoidPaymentDto,
  ListPaymentsDto,
  CreateInstallmentDto,
  UpdateInstallmentDto,
  ValidateInstallmentDto,
  RejectInstallmentDto,
} from './dto/payment.dto';

/**
 * Balance figures are computed in SQL on every read rather than stored.
 *
 * Two reasons this is not an optimisation choice but a correctness one:
 *   1. A stored total can drift from the installments it claims to summarise.
 *   2. `overdue` depends on today's date, so any persisted copy is stale the
 *      moment midnight passes — no cron can fix that, only derivation.
 *
 * Sums stay in Postgres `numeric` throughout; they are only converted to JS
 * numbers at the response boundary, so no float arithmetic touches money.
 */
const PAID_SQL = `COALESCE((
  SELECT SUM(i."amount") FROM "payment_installments" i
  WHERE i."paymentId" = p."id" AND i."status" = 'validated'
), 0)`;

const REFUNDED_SQL = `COALESCE((
  SELECT SUM(i."amount") FROM "payment_installments" i
  WHERE i."paymentId" = p."id" AND i."status" = 'refunded'
), 0)`;

const COUNT_SQL = `(
  SELECT COUNT(*) FROM "payment_installments" i WHERE i."paymentId" = p."id"
)`;

const REMAINING_SQL = `GREATEST(p."amountDue" - ${PAID_SQL}, 0)`;

/** Precedence: void > paid > overdue > partial > pending. */
const STATUS_SQL = `CASE
  WHEN p."voidedAt" IS NOT NULL      THEN 'void'
  WHEN ${PAID_SQL} >= p."amountDue"  THEN 'paid'
  WHEN p."dueDate" < CURRENT_DATE    THEN 'overdue'
  WHEN ${PAID_SQL} > 0               THEN 'partial'
  ELSE                                    'pending'
END`;

/**
 * Reported alongside `status` so a part-paid invoice that is also late can be
 * badged "Partial · Overdue" without the single status value hiding either fact.
 */
const IS_OVERDUE_SQL = `(
  p."voidedAt" IS NULL
  AND p."dueDate" < CURRENT_DATE
  AND ${PAID_SQL} < p."amountDue"
)`;

/** Client-detail columns exposed with each obligation. */
const TENANT_FIELDS = [
  'tenant.id',
  'tenant.name',
  'tenant.slug',
  'tenant.contactName',
  'tenant.contactEmail',
  'tenant.contactPhone',
  'tenant.address',
  'tenant.status',
  'tenant.subscriptionPlan',
];

export interface PaginatedPayments {
  data: PaymentWithBalance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BillingSummaryRow {
  currency: string;
  invoiceCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
}

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    @InjectRepository(Payment, 'master')
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(PaymentInstallment, 'master')
    private readonly installmentRepo: Repository<PaymentInstallment>,

    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,

    @InjectRepository(SubscriptionPlanEntity, 'master')
    private readonly planRepo: Repository<SubscriptionPlanEntity>,

    @InjectDataSource('master')
    private readonly dataSource: DataSource,

    private readonly lifecycleService: TenantLifecycleService,
  ) {}

  // ─── Reads ─────────────────────────────────────────────────────────────────

  async list(filters: ListPaymentsDto): Promise<PaginatedPayments> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 25));

    const qb = this.baseQuery();
    this.applyFilters(qb, filters);

    const total = await qb.getCount();

    this.applySort(qb, filters);
    qb.offset((page - 1) * limit).limit(limit);

    const data = await this.hydrate(qb);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Per-currency roll-up. Currencies are never summed together. */
  async summary(filters: ListPaymentsDto): Promise<BillingSummaryRow[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.tenant', 'tenant')
      .select('p.currency', 'currency')
      .addSelect('COUNT(*)', 'invoiceCount')
      .addSelect(`SUM(p."amountDue")`, 'totalBilled')
      .addSelect(`SUM(${PAID_SQL})`, 'totalCollected')
      .addSelect(`SUM(${REMAINING_SQL})`, 'totalOutstanding')
      .addSelect(`COUNT(*) FILTER (WHERE ${IS_OVERDUE_SQL})`, 'overdueCount')
      .addSelect(
        `COALESCE(SUM(${REMAINING_SQL}) FILTER (WHERE ${IS_OVERDUE_SQL}), 0)`,
        'overdueAmount',
      )
      .groupBy('p.currency');

    this.applyFilters(qb, filters);

    const rows = await qb.getRawMany<Record<string, string>>();
    return rows.map((r) => ({
      currency: r.currency,
      invoiceCount: Number(r.invoiceCount),
      totalBilled: Number(r.totalBilled),
      totalCollected: Number(r.totalCollected),
      totalOutstanding: Number(r.totalOutstanding),
      overdueCount: Number(r.overdueCount),
      overdueAmount: Number(r.overdueAmount),
    }));
  }

  async findOne(
    id: string,
  ): Promise<PaymentWithBalance & { installments: PaymentInstallment[] }> {
    const qb = this.baseQuery().where('p.id = :id', { id });
    const [payment] = await this.hydrate(qb);
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);

    const installments = await this.installmentRepo.find({
      where: { paymentId: id },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });

    return { ...payment, installments };
  }

  async listForTenant(tenantId: number): Promise<PaymentWithBalance[]> {
    await this.getTenantOrThrow(tenantId);
    const qb = this.baseQuery()
      .where('p.tenantId = :tenantId', { tenantId })
      .orderBy('p."periodStart"', 'DESC');
    return this.hydrate(qb);
  }

  // ─── Obligation writes ─────────────────────────────────────────────────────

  async create(
    tenantId: number,
    dto: CreatePaymentDto,
    performedBy?: string,
  ): Promise<PaymentWithBalance> {
    await this.getTenantOrThrow(tenantId);

    if (new Date(dto.periodEnd) < new Date(dto.periodStart)) {
      throw new BadRequestException('periodEnd cannot precede periodStart');
    }

    const currency =
      dto.currency?.toUpperCase() ?? (await this.planCurrency(dto.planName));

    const payment = this.paymentRepo.create({
      tenantId,
      amountDue: dto.amountDue,
      currency,
      planName: dto.planName,
      billingCycle: dto.billingCycle as Payment['billingCycle'],
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      dueDate: dto.dueDate ?? dto.periodStart,
      notes: dto.notes ?? null,
      voidedAt: null,
      voidReason: null,
    });

    const saved = await this.paymentRepo.save(payment);
    await this.lifecycleService.logActivity(
      tenantId,
      'subscription_invoice_created',
      {
        paymentId: saved.id,
        amountDue: saved.amountDue,
        currency: saved.currency,
        plan: saved.planName,
        billingCycle: saved.billingCycle,
        period: `${saved.periodStart} → ${saved.periodEnd}`,
      },
      performedBy,
    );

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdatePaymentDto,
    performedBy?: string,
  ): Promise<PaymentWithBalance> {
    const payment = await this.getPaymentOrThrow(id);
    if (payment.voidedAt) {
      throw new ConflictException('A voided payment cannot be edited');
    }

    const paid = await this.validatedTotal(id);

    if (dto.amountDue !== undefined && dto.amountDue < paid) {
      throw new BadRequestException(
        `amountDue (${dto.amountDue}) cannot be below the ${paid} already recorded against this payment`,
      );
    }

    if (dto.currency && dto.currency.toUpperCase() !== payment.currency) {
      const count = await this.installmentRepo.count({
        where: { paymentId: id },
      });
      if (count > 0) {
        throw new ConflictException(
          'Currency cannot change once installments have been recorded',
        );
      }
    }

    const periodStart = dto.periodStart ?? payment.periodStart;
    const periodEnd = dto.periodEnd ?? payment.periodEnd;
    if (new Date(periodEnd) < new Date(periodStart)) {
      throw new BadRequestException('periodEnd cannot precede periodStart');
    }

    Object.assign(payment, {
      ...(dto.amountDue !== undefined && { amountDue: dto.amountDue }),
      ...(dto.currency && { currency: dto.currency.toUpperCase() }),
      ...(dto.planName && { planName: dto.planName }),
      ...(dto.billingCycle && {
        billingCycle: dto.billingCycle as Payment['billingCycle'],
      }),
      ...(dto.periodStart && { periodStart: dto.periodStart }),
      ...(dto.periodEnd && { periodEnd: dto.periodEnd }),
      ...(dto.dueDate && { dueDate: dto.dueDate }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.paymentRepo.save(payment);
    await this.lifecycleService.logActivity(
      payment.tenantId,
      'subscription_invoice_updated',
      { paymentId: id, changes: { ...dto } },
      performedBy,
    );

    return this.findOne(id);
  }

  async void(
    id: string,
    dto: VoidPaymentDto,
    performedBy?: string,
  ): Promise<PaymentWithBalance> {
    const payment = await this.getPaymentOrThrow(id);
    if (payment.voidedAt) {
      throw new ConflictException('Payment is already void');
    }

    const paid = await this.validatedTotal(id);
    if (paid > 0) {
      throw new ConflictException(
        `Cannot void: ${paid} ${payment.currency} has already been collected. Refund the installments first.`,
      );
    }

    payment.voidedAt = new Date();
    payment.voidReason = dto.reason;
    await this.paymentRepo.save(payment);
    await this.lifecycleService.logActivity(
      payment.tenantId,
      'subscription_invoice_voided',
      { paymentId: id, reason: dto.reason },
      performedBy,
    );

    return this.findOne(id);
  }

  async remove(id: string, performedBy?: string): Promise<{ message: string }> {
    const payment = await this.getPaymentOrThrow(id);
    const count = await this.installmentRepo.count({
      where: { paymentId: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete: ${count} installment(s) are recorded against this payment. Void it instead.`,
      );
    }

    await this.paymentRepo.remove(payment);
    await this.lifecycleService.logActivity(
      payment.tenantId,
      'subscription_invoice_deleted',
      { paymentId: id },
      performedBy,
    );
    return { message: 'Payment deleted' };
  }

  // ─── Tranche writes ────────────────────────────────────────────────────────

  /**
   * Records a tranche against an obligation.
   *
   * The overpay check runs inside a transaction that locks the parent row, so
   * two tranches submitted concurrently cannot each pass the check and then
   * jointly exceed the balance.
   */
  async addInstallment(
    paymentId: string,
    dto: CreateInstallmentDto,
    performedBy?: string,
  ): Promise<PaymentInstallment> {
    const validate = dto.validateImmediately !== false;

    const installment = await this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, paymentId);

      if (payment.voidedAt) {
        throw new ConflictException(
          'Cannot record an installment against a voided payment',
        );
      }
      if (new Date(dto.paymentDate) < new Date(payment.periodStart)) {
        throw new BadRequestException(
          `paymentDate cannot precede the billing period start (${payment.periodStart})`,
        );
      }

      const paid = await this.validatedTotal(paymentId, manager);
      const remaining = this.round2(payment.amountDue - paid);
      if (dto.amount > remaining) {
        throw new BadRequestException(
          `Amount ${dto.amount} exceeds the remaining balance of ${remaining} ${payment.currency}`,
        );
      }

      const row = manager.create(PaymentInstallment, {
        paymentId,
        tenantId: payment.tenantId,
        amount: dto.amount,
        paymentDate: dto.paymentDate,
        paymentType: dto.paymentType as PaymentInstallment['paymentType'],
        status: validate ? 'validated' : 'pending',
        referenceNumber: dto.referenceNumber ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        notes: dto.notes ?? null,
        validatedBy: validate ? (dto.validatedBy ?? performedBy ?? null) : null,
        validatedAt: validate ? new Date() : null,
        rejectionReason: null,
      });
      return manager.save(PaymentInstallment, row);
    });

    await this.lifecycleService.logActivity(
      installment.tenantId,
      'installment_recorded',
      {
        paymentId,
        installmentId: installment.id,
        amount: installment.amount,
        paymentType: installment.paymentType,
        paymentDate: installment.paymentDate,
        status: installment.status,
      },
      performedBy,
    );

    if (validate) await this.syncTenantIfSettled(paymentId, performedBy);
    return installment;
  }

  async updateInstallment(
    id: string,
    dto: UpdateInstallmentDto,
    performedBy?: string,
  ): Promise<PaymentInstallment> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const installment = await manager.findOne(PaymentInstallment, {
        where: { id },
      });
      if (!installment) {
        throw new NotFoundException(`Installment ${id} not found`);
      }
      if (installment.status === 'refunded') {
        throw new ConflictException('A refunded installment cannot be edited');
      }

      const payment = await this.lockPayment(manager, installment.paymentId);

      if (dto.amount !== undefined && installment.status === 'validated') {
        // Compare against the balance excluding this row, so raising an
        // already-counted tranche is checked against the real headroom.
        const paidExcludingSelf =
          (await this.validatedTotal(installment.paymentId, manager)) -
          installment.amount;
        const remaining = this.round2(payment.amountDue - paidExcludingSelf);
        if (dto.amount > remaining) {
          throw new BadRequestException(
            `Amount ${dto.amount} exceeds the remaining balance of ${remaining} ${payment.currency}`,
          );
        }
      }

      if (
        dto.paymentDate &&
        new Date(dto.paymentDate) < new Date(payment.periodStart)
      ) {
        throw new BadRequestException(
          `paymentDate cannot precede the billing period start (${payment.periodStart})`,
        );
      }

      Object.assign(installment, {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.paymentDate && { paymentDate: dto.paymentDate }),
        ...(dto.paymentType && {
          paymentType: dto.paymentType as PaymentInstallment['paymentType'],
        }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      });

      return manager.save(PaymentInstallment, installment);
    });

    await this.lifecycleService.logActivity(
      updated.tenantId,
      'installment_updated',
      { installmentId: id, paymentId: updated.paymentId, changes: { ...dto } },
      performedBy,
    );

    await this.syncTenantIfSettled(updated.paymentId, performedBy);
    return updated;
  }

  async validateInstallment(
    id: string,
    dto: ValidateInstallmentDto,
    performedBy?: string,
  ): Promise<PaymentInstallment> {
    const validated = await this.dataSource.transaction(async (manager) => {
      const installment = await manager.findOne(PaymentInstallment, {
        where: { id },
      });
      if (!installment) {
        throw new NotFoundException(`Installment ${id} not found`);
      }
      if (installment.status !== 'pending') {
        throw new ConflictException(
          `Installment is already ${installment.status}`,
        );
      }

      const payment = await this.lockPayment(manager, installment.paymentId);
      if (payment.voidedAt) {
        throw new ConflictException(
          'Cannot validate an installment on a voided payment',
        );
      }

      // Re-checked here, not just at creation: several pending tranches can
      // each fit the balance individually yet overshoot it together.
      const paid = await this.validatedTotal(installment.paymentId, manager);
      const remaining = this.round2(payment.amountDue - paid);
      if (installment.amount > remaining) {
        throw new BadRequestException(
          `Validating ${installment.amount} would exceed the remaining balance of ${remaining} ${payment.currency}`,
        );
      }

      installment.status = 'validated';
      installment.validatedBy = dto.validatedBy ?? performedBy ?? null;
      installment.validatedAt = new Date();
      return manager.save(PaymentInstallment, installment);
    });

    await this.lifecycleService.logActivity(
      validated.tenantId,
      'installment_validated',
      {
        installmentId: id,
        paymentId: validated.paymentId,
        amount: validated.amount,
        validatedBy: validated.validatedBy,
      },
      performedBy,
    );

    await this.syncTenantIfSettled(validated.paymentId, performedBy);
    return validated;
  }

  async rejectInstallment(
    id: string,
    dto: RejectInstallmentDto,
    performedBy?: string,
  ): Promise<PaymentInstallment> {
    const installment = await this.getInstallmentOrThrow(id);
    if (installment.status !== 'pending') {
      throw new ConflictException(
        `Only pending installments can be rejected (this one is ${installment.status})`,
      );
    }

    installment.status = 'rejected';
    installment.rejectionReason = dto.reason;
    const saved = await this.installmentRepo.save(installment);

    await this.lifecycleService.logActivity(
      installment.tenantId,
      'installment_rejected',
      {
        installmentId: id,
        paymentId: installment.paymentId,
        reason: dto.reason,
      },
      performedBy,
    );
    return saved;
  }

  async refundInstallment(
    id: string,
    performedBy?: string,
  ): Promise<PaymentInstallment> {
    const installment = await this.getInstallmentOrThrow(id);
    if (installment.status !== 'validated') {
      throw new ConflictException(
        'Only validated installments can be refunded',
      );
    }

    installment.status = 'refunded';
    const saved = await this.installmentRepo.save(installment);

    await this.lifecycleService.logActivity(
      installment.tenantId,
      'installment_refunded',
      {
        installmentId: id,
        paymentId: installment.paymentId,
        amount: installment.amount,
      },
      performedBy,
    );
    return saved;
  }

  async removeInstallment(
    id: string,
    performedBy?: string,
  ): Promise<{ message: string }> {
    const installment = await this.getInstallmentOrThrow(id);
    await this.installmentRepo.remove(installment);
    await this.lifecycleService.logActivity(
      installment.tenantId,
      'installment_deleted',
      {
        installmentId: id,
        paymentId: installment.paymentId,
        amount: installment.amount,
      },
      performedBy,
    );
    return { message: 'Installment deleted' };
  }

  async listInstallments(paymentId: string): Promise<PaymentInstallment[]> {
    await this.getPaymentOrThrow(paymentId);
    return this.installmentRepo.find({
      where: { paymentId },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private baseQuery(): SelectQueryBuilder<Payment> {
    return this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.tenant', 'tenant')
      .addSelect(TENANT_FIELDS)
      .addSelect(PAID_SQL, 'amountPaid')
      .addSelect(REFUNDED_SQL, 'amountRefunded')
      .addSelect(REMAINING_SQL, 'amountRemaining')
      .addSelect(STATUS_SQL, 'status')
      .addSelect(IS_OVERDUE_SQL, 'isOverdue')
      .addSelect(COUNT_SQL, 'installmentCount');
  }

  private applyFilters(
    qb: SelectQueryBuilder<Payment>,
    f: ListPaymentsDto,
  ): void {
    if (f.tenantId) {
      qb.andWhere('p."tenantId" = :tenantId', { tenantId: f.tenantId });
    }
    if (f.status) {
      qb.andWhere(`${STATUS_SQL} = :status`, { status: f.status });
    }
    if (f.billingCycle) {
      qb.andWhere('p."billingCycle" = :billingCycle', {
        billingCycle: f.billingCycle,
      });
    }
    if (f.planName) {
      qb.andWhere('p."planName" = :planName', { planName: f.planName });
    }
    if (f.currency) {
      qb.andWhere('p."currency" = :currency', {
        currency: f.currency.toUpperCase(),
      });
    }
    // Overlap, not containment: a period straddling the window still counts.
    if (f.periodFrom) {
      qb.andWhere('p."periodEnd" >= :periodFrom', { periodFrom: f.periodFrom });
    }
    if (f.periodTo) {
      qb.andWhere('p."periodStart" <= :periodTo', { periodTo: f.periodTo });
    }
    if (f.dueFrom) {
      qb.andWhere('p."dueDate" >= :dueFrom', { dueFrom: f.dueFrom });
    }
    if (f.dueTo) {
      qb.andWhere('p."dueDate" <= :dueTo', { dueTo: f.dueTo });
    }
    if (f.search) {
      qb.andWhere(
        `(tenant."name" ILIKE :search OR tenant."slug" ILIKE :search OR tenant."contactName" ILIKE :search)`,
        { search: `%${f.search}%` },
      );
    }
  }

  private applySort(qb: SelectQueryBuilder<Payment>, f: ListPaymentsDto): void {
    const dir =
      (f.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const columns: Record<string, string> = {
      dueDate: 'p."dueDate"',
      periodStart: 'p."periodStart"',
      periodEnd: 'p."periodEnd"',
      amountDue: 'p."amountDue"',
      amountRemaining: REMAINING_SQL,
      createdAt: 'p."createdAt"',
      tenantName: 'tenant."name"',
    };
    qb.orderBy(columns[f.sortBy ?? 'dueDate'] ?? columns.dueDate, dir);
    qb.addOrderBy('p."createdAt"', 'DESC');
  }

  /** Merges the SQL-derived figures back onto the hydrated entities. */
  private async hydrate(
    qb: SelectQueryBuilder<Payment>,
  ): Promise<PaymentWithBalance[]> {
    const { entities, raw } =
      await qb.getRawAndEntities<Record<string, unknown>>();
    return entities.map((entity, i) => {
      const r = raw[i] ?? {};
      return {
        ...entity,
        amountPaid: Number(r.amountPaid ?? 0),
        amountRefunded: Number(r.amountRefunded ?? 0),
        amountRemaining: Number(r.amountRemaining ?? 0),
        status: (r.status ?? 'pending') as PaymentStatus,
        isOverdue: Boolean(r.isOverdue),
        installmentCount: Number(r.installmentCount ?? 0),
      } as PaymentWithBalance;
    });
  }

  /** Sum of validated tranches, as a number rounded to 2dp. */
  private async validatedTotal(
    paymentId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager
      ? manager.getRepository(PaymentInstallment)
      : this.installmentRepo;
    const row = await repo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i."amount"), 0)', 'total')
      .where('i."paymentId" = :paymentId', { paymentId })
      .andWhere(`i."status" = 'validated'`)
      .getRawOne<{ total: string }>();
    return this.round2(Number(row?.total ?? 0));
  }

  /**
   * Serialises concurrent writes against the same obligation. Without this
   * lock two tranches could each read the same balance and both pass the
   * overpay guard.
   */
  private async lockPayment(
    manager: EntityManager,
    paymentId: string,
  ): Promise<Payment> {
    const payment = await manager.findOne(Payment, {
      where: { id: paymentId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    return payment;
  }

  /**
   * When an obligation is fully settled, roll the tenant onto the paid plan
   * and period. This replaces the old per-payment activation, which fired on
   * a single payment and so had no notion of a period being part-paid.
   */
  private async syncTenantIfSettled(
    paymentId: string,
    performedBy?: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment || payment.voidedAt) return;

    const paid = await this.validatedTotal(paymentId);
    if (paid < payment.amountDue) return;

    await this.lifecycleService.activateFromPayment(
      payment.tenantId,
      payment.planName,
      payment.periodStart,
      payment.periodEnd,
      performedBy,
    );
    this.logger.log(
      `Payment ${paymentId} fully settled — tenant #${payment.tenantId} activated on ${payment.planName}`,
    );
  }

  private async planCurrency(planName: string): Promise<string> {
    const plan = await this.planRepo.findOne({ where: { name: planName } });
    return plan?.currency ?? 'MAD';
  }

  private async getPaymentOrThrow(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  private async getInstallmentOrThrow(id: string): Promise<PaymentInstallment> {
    const installment = await this.installmentRepo.findOne({ where: { id } });
    if (!installment) {
      throw new NotFoundException(`Installment ${id} not found`);
    }
    return installment;
  }

  private async getTenantOrThrow(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} not found`);
    return tenant;
  }

  /** Guards against binary-float noise leaking into comparisons. */
  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
