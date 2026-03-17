import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Payment } from './payment.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private get paymentsRepository(): Repository<Payment> {
    return this.tenantConnService.getRepository(Payment);
  }

  private get invoicesRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Verify invoice exists
    const invoice = await this.invoicesRepository.findOne({
      where: { id: createPaymentDto.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with ID ${createPaymentDto.invoiceId} not found`,
      );
    }

    const payment = this.paymentsRepository.create(createPaymentDto);
    const savedPayment = await this.paymentsRepository.save(payment);

    // Update invoice paid status based on total payments
    await this.updateInvoicePaidStatus(invoice.id);

    return savedPayment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['invoice'],
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByInvoice(invoiceId: number): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { invoiceId },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['invoice'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(
    id: number,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    Object.assign(payment, updatePaymentDto);
    const updatedPayment = await this.paymentsRepository.save(payment);

    // Update invoice paid status
    if (payment.invoiceId) {
      await this.updateInvoicePaidStatus(payment.invoiceId);
    }

    return updatedPayment;
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    const invoiceId = payment.invoiceId;

    await this.paymentsRepository.remove(payment);

    // Update invoice paid status after deletion
    if (invoiceId) {
      await this.updateInvoicePaidStatus(invoiceId);
    }
  }

  async getTotalPaid(invoiceId: number): Promise<number> {
    const result = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.invoiceId = :invoiceId', { invoiceId })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  private async updateInvoicePaidStatus(invoiceId: number): Promise<void> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const totalPaid = await this.getTotalPaid(invoiceId);
    const total = parseFloat(invoice.total.toString());

    // Determine status based on validation state and payments
    let status: InvoiceStatus;
    if (!invoice.isValidated) {
      status = InvoiceStatus.DRAFT;
    } else if (totalPaid === 0) {
      status = InvoiceStatus.UNPAID;
    } else if (totalPaid >= total) {
      status = InvoiceStatus.PAID;
    } else {
      status = InvoiceStatus.PARTIAL;
    }

    invoice.status = status;
    invoice.paidAmount = totalPaid;
    invoice.remainingAmount = Math.max(total - totalPaid, 0);

    await this.invoicesRepository.save(invoice);

    // Invalidate invoice cache so fresh data is returned
    await this.cacheManager.del(`invoice:${invoiceId}`);
  }
}
