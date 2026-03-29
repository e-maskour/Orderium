import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from './entities/order.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import {
    CreateOrderPaymentDto,
    UpdateOrderPaymentDto,
} from './dto/create-order-payment.dto';

@Injectable()
export class OrderPaymentsService {
    constructor(private readonly tenantConnService: TenantConnectionService) { }

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
