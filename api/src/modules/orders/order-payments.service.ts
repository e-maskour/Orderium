import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order, OrderOriginType } from './entities/order.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import {
  CreateOrderPaymentDto,
  UpdateOrderPaymentDto,
} from './dto/create-order-payment.dto';
import { FilterCaisseDto, CaissePaymentStatus } from './dto/filter-caisse.dto';
import { applyListSort } from '../../common/utils/list-sort';

@Injectable()
export class OrderPaymentsService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  private get repo(): Repository<OrderPayment> {
    return this.tenantConnService.getRepository(OrderPayment);
  }

  private get orderRepo(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  async create(dto: CreateOrderPaymentDto): Promise<OrderPayment> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order #${dto.orderId} not found`);
    }

    const payment = this.repo.create(dto);
    const saved = await this.repo.save(payment);
    await this.syncOrderPaymentTotals(dto.orderId);
    return saved;
  }

  async findAll(): Promise<OrderPayment[]> {
    return this.repo.find({
      relations: ['order', 'customer'],
      order: { paymentDate: 'DESC', dateCreated: 'DESC' },
    });
  }

  /**
   * Caisse list. Search, status and pagination are applied in SQL; `counts`
   * (per-status tab badges, search applied) and `summary` (totals of the
   * filtered set) are computed over the whole filtered set, not the page.
   * When neither `page` nor `limit` is given every matching row is returned.
   */
  async getCaisseSummary(filters: FilterCaisseDto = {}): Promise<{
    rows: any[];
    total: number;
    counts: Record<'all' | CaissePaymentStatus, number>;
    summary: {
      totalDue: number;
      totalCollected: number;
      totalRemaining: number;
    };
  }> {
    const paidExpr = 'COALESCE("o"."paidAmount", 0)';
    const totalExpr = 'COALESCE("o"."total", 0)';
    const statusSql: Record<CaissePaymentStatus, string> = {
      paid: `(${paidExpr} >= ${totalExpr} AND ${totalExpr} > 0)`,
      partial: `(${paidExpr} > 0 AND NOT (${paidExpr} >= ${totalExpr} AND ${totalExpr} > 0))`,
      unpaid: `(${paidExpr} <= 0)`,
    };

    const base = () => {
      const qb = this.orderRepo
        .createQueryBuilder('o')
        .leftJoin('o.customer', 'customer')
        .where('o.direction = :dir', { dir: 'VENTE' })
        .andWhere('o.originType != :origin', {
          origin: OrderOriginType.BACKOFFICE,
        });
      const search = filters.search?.trim();
      if (search) {
        qb.andWhere(
          `(COALESCE("o"."orderNumber", "o"."documentNumber") ILIKE :q
           OR COALESCE("customer"."name", "o"."customerName", '') ILIKE :q)`,
          { q: `%${search}%` },
        );
      }
      return qb;
    };

    // Tab badge counts: search applied, status not applied
    const countsRaw = await base()
      .select('COUNT(*)', 'all')
      .addSelect(`COUNT(*) FILTER (WHERE ${statusSql.paid})`, 'paid')
      .addSelect(`COUNT(*) FILTER (WHERE ${statusSql.partial})`, 'partial')
      .addSelect(`COUNT(*) FILTER (WHERE ${statusSql.unpaid})`, 'unpaid')
      .getRawOne<Record<string, string>>();
    const counts = {
      all: parseInt(countsRaw?.all ?? '0', 10),
      paid: parseInt(countsRaw?.paid ?? '0', 10),
      partial: parseInt(countsRaw?.partial ?? '0', 10),
      unpaid: parseInt(countsRaw?.unpaid ?? '0', 10),
    };

    const filtered = () => {
      const qb = base();
      if (filters.status) qb.andWhere(statusSql[filters.status]);
      return qb;
    };

    const sumRaw = await filtered()
      .select(`COALESCE(SUM(${totalExpr}), 0)`, 'totalDue')
      .addSelect(`COALESCE(SUM(${paidExpr}), 0)`, 'totalCollected')
      .addSelect(
        'COALESCE(SUM(COALESCE("o"."remainingAmount", 0)), 0)',
        'totalRemaining',
      )
      .getRawOne<Record<string, string>>();
    const summary = {
      totalDue: parseFloat(sumRaw?.totalDue ?? '0'),
      totalCollected: parseFloat(sumRaw?.totalCollected ?? '0'),
      totalRemaining: parseFloat(sumRaw?.totalRemaining ?? '0'),
    };
    const total = filters.status ? counts[filters.status] : counts.all;

    const rowsQb = filtered()
      .select('"o"."id"', 'id')
      .addSelect(
        'COALESCE("o"."orderNumber", "o"."documentNumber")',
        'orderNumber',
      )
      .addSelect(
        `COALESCE("customer"."name", NULLIF("o"."customerName", ''))`,
        'customerName',
      )
      .addSelect('"o"."customerId"', 'customerId')
      .addSelect('"o"."total"', 'total')
      .addSelect('"o"."paidAmount"', 'paidAmount')
      .addSelect('"o"."remainingAmount"', 'remainingAmount')
      .addSelect('"o"."date"', 'date')
      .addSelect('"o"."dateCreated"', 'dateCreated');

    // Whitelisted sort; creation date (newest first) is the default and the
    // id is always appended so paginated pages stay stable.
    applyListSort(
      rowsQb,
      { field: filters.sortField, order: filters.sortOrder },
      {
        orderNumber: 'COALESCE("o"."orderNumber", "o"."documentNumber")',
        customerName: `COALESCE("customer"."name", NULLIF("o"."customerName", ''))`,
        // Share of the total already paid: unpaid → partial → paid
        paymentStatus: `CASE WHEN ${totalExpr} > 0 THEN ${paidExpr} / ${totalExpr} ELSE 0 END`,
        total: totalExpr,
        paidAmount: paidExpr,
        remainingAmount: 'COALESCE("o"."remainingAmount", 0)',
        dateCreated: '"o"."dateCreated"',
      },
      { column: '"o"."dateCreated"', order: 'DESC' },
    );
    rowsQb.addOrderBy('"o"."id"', 'DESC');
    if (filters.page || filters.limit) {
      const limit = filters.limit ?? 25;
      rowsQb.offset(((filters.page ?? 1) - 1) * limit).limit(limit);
    }
    const rawRows = await rowsQb.getRawMany();

    const rows = rawRows.map((row) => {
      const total = parseFloat(row.total?.toString() || '0');
      const paid = parseFloat(row.paidAmount?.toString() || '0');
      const remaining = parseFloat(row.remainingAmount?.toString() || '0');
      let paymentStatus: CaissePaymentStatus = 'unpaid';
      if (paid >= total && total > 0) paymentStatus = 'paid';
      else if (paid > 0) paymentStatus = 'partial';

      return {
        id: row.id,
        orderNumber: row.orderNumber || null,
        customerName: row.customerName || null,
        customerId: row.customerId,
        total,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentStatus,
        date: row.date,
        dateCreated: row.dateCreated,
      };
    });

    return { rows, total, counts, summary };
  }

  async findByOrder(orderId: number): Promise<OrderPayment[]> {
    return this.repo.find({
      where: { orderId },
      order: { paymentDate: 'DESC', dateCreated: 'DESC' },
    });
  }

  async findOne(id: number): Promise<OrderPayment> {
    const payment = await this.repo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Order payment #${id} not found`);
    }
    return payment;
  }

  async update(id: number, dto: UpdateOrderPaymentDto): Promise<OrderPayment> {
    const payment = await this.findOne(id);
    Object.assign(payment, dto);
    const saved = await this.repo.save(payment);
    await this.syncOrderPaymentTotals(payment.orderId);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    const orderId = payment.orderId;
    await this.repo.remove(payment);
    await this.syncOrderPaymentTotals(orderId);
  }

  async getTotalPaid(orderId: number): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('op')
      .select('SUM(op.amount)', 'total')
      .where('op.orderId = :orderId', { orderId })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  private async syncOrderPaymentTotals(orderId: number): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return;

    const totalPaid = await this.getTotalPaid(orderId);
    const total = parseFloat(order.total.toString());

    order.paidAmount = totalPaid;
    order.remainingAmount = Math.max(total - totalPaid, 0);

    await this.orderRepo.save(order);
  }
}
