import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order, OrderOriginType } from './entities/order.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import {
  CreateOrderPaymentDto,
  UpdateOrderPaymentDto,
} from './dto/create-order-payment.dto';

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

  async getCaisseSummary(): Promise<any[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.customer', 'customer')
      .select('o.id', 'id')
      .addSelect(
        'COALESCE("o"."orderNumber", "o"."documentNumber")',
        'orderNumber',
      )
      .addSelect(
        `COALESCE("customer"."name", NULLIF("o"."customerName", ''))`,
        'customerName',
      )
      .addSelect('o.customerId', 'customerId')
      .addSelect('o.total', 'total')
      .addSelect('o.paidAmount', 'paidAmount')
      .addSelect('o.remainingAmount', 'remainingAmount')
      .addSelect('o.date', 'date')
      .addSelect('o.dateCreated', 'dateCreated')
      .where('o.direction = :dir', { dir: 'VENTE' })
      .andWhere('o.originType != :origin', {
        origin: OrderOriginType.BACKOFFICE,
      })
      .orderBy('o.dateCreated', 'DESC')
      .getRawMany();

    return rows.map((row) => {
      const total = parseFloat(row.total?.toString() || '0');
      const paid = parseFloat(row.paidAmount?.toString() || '0');
      const remaining = parseFloat(row.remainingAmount?.toString() || '0');
      let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
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
