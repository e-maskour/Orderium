import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Verify invoice exists
    const invoice = await this.invoicesRepository.findOne({
      where: { id: createPaymentDto.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${createPaymentDto.invoiceId} not found`);
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

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
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
      relations: ['items'],
    });

    if (!invoice) return;

    const totalPaid = await this.getTotalPaid(invoiceId);
    const total = parseFloat(invoice.total.toString());

    let status = InvoiceStatus.DRAFT;

    // Determine status based on items and payments
    if (!invoice.items || invoice.items.length === 0) {
      // No items = draft
      status = InvoiceStatus.DRAFT;
    } else if (totalPaid === 0) {
      // Has items but no payments = unpaid
      status = InvoiceStatus.UNPAID;
    } else if (totalPaid >= total) {
      // Fully paid
      status = InvoiceStatus.PAID;
    } else {
      // Partial payment
      status = InvoiceStatus.PARTIAL;
    }

    invoice.status = status;

    await this.invoicesRepository.save(invoice);
  }
}
