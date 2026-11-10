import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Payment } from './payment.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';
import { FilterPaymentsDto } from './dto/filter-payments.dto';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

  /**
   * List payments with every filter applied in SQL so that pagination,
   * the total count and the total amount all reflect the active filters.
   * When neither `page` nor `limit` is given every matching row is returned.
   */
  async findAll(filters: FilterPaymentsDto = {}): Promise<{
    payments: Payment[];
    total: number;
    totalAmount: number;
  }> {
    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice');

    if (filters.invoiceId) {
      qb.andWhere('payment.invoiceId = :invoiceId', {
        invoiceId: filters.invoiceId,
      });
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(invoice.documentNumber) LIKE :q
         OR LOWER(invoice.customerName) LIKE :q
         OR LOWER(invoice.customerPhone) LIKE :q
         OR LOWER(invoice.supplierName) LIKE :q
         OR LOWER(invoice.supplierPhone) LIKE :q
         OR LOWER(payment.referenceNumber) LIKE :q)`,
        { q },
      );
    }
    if (filters.paymentType) {
      qb.andWhere('payment.paymentType = :paymentType', {
        paymentType: filters.paymentType,
      });
    }
    // paymentDate is a DATE column: inclusive bounds cover the whole end day.
    if (filters.dateFrom) {
      qb.andWhere('payment.paymentDate >= :dateFrom', {
        dateFrom: filters.dateFrom.slice(0, 10),
      });
    }
    if (filters.dateTo) {
      qb.andWhere('payment.paymentDate <= :dateTo', {
        dateTo: filters.dateTo.slice(0, 10),
      });
    }
    if (filters.customerId) {
      qb.andWhere('payment.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters.supplierId) {
      qb.andWhere('payment.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }
    if (filters.direction) {
      // Prefer the invoice direction; fall back to the partner column for
      // payments not linked to an invoice.
      const isAchat = filters.direction === 'achat';
      qb.andWhere(
        `(invoice.direction = :direction OR (invoice.id IS NULL AND payment.${
          isAchat ? 'supplierId' : 'customerId'
        } IS NOT NULL))`,
        {
          direction: isAchat
            ? DocumentDirection.ACHAT
            : DocumentDirection.VENTE,
        },
      );
    }

    const aggregate = await qb
      .clone()
      .select('COUNT(payment.id)', 'count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalAmount')
      .orderBy()
      .getRawOne<{ count: string; totalAmount: string }>();

    const sortField = filters.sortField ?? 'paymentDate';
    const sortOrder = filters.sortOrder ?? 'DESC';
    qb.orderBy(`payment.${sortField}`, sortOrder);
    if (sortField !== 'createdAt') qb.addOrderBy('payment.createdAt', 'DESC');
    qb.addOrderBy('payment.id', 'DESC');

    if (filters.page || filters.limit) {
      const limit = filters.limit ?? 25;
      const page = filters.page ?? 1;
      qb.skip((page - 1) * limit).take(limit);
    }

    const payments = await qb.getMany();
    return {
      payments,
      total: parseInt(aggregate?.count ?? '0', 10),
      totalAmount: parseFloat(aggregate?.totalAmount ?? '0'),
    };
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
