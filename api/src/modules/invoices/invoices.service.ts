import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceItem, InvoiceStatus } from './entities/invoice.entity';

interface CreateInvoiceItemDTO {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax?: number;
}

interface CreateInvoiceDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  dueDate?: string;
  items: CreateInvoiceItemDTO[];
  tax: number;
  discount: number;
  discountType: number;
  notes?: string;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
  ) {}

  private async calculateInvoiceStatus(invoiceId: number): Promise<InvoiceStatus> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items'],
    });

    if (!invoice) {
      return InvoiceStatus.DRAFT;
    }

    // Check if invoice has items
    if (!invoice.items || invoice.items.length === 0) {
      return InvoiceStatus.DRAFT;
    }

    // Check payment status by calculating total paid
    const totalPaid = await this.getTotalPaid(invoiceId);
    const total = parseFloat(invoice.total.toString());

    if (totalPaid === 0) {
      return InvoiceStatus.UNPAID;
    } else if (totalPaid >= total) {
      return InvoiceStatus.PAID;
    } else {
      return InvoiceStatus.PARTIAL;
    }
  }

  private async getTotalPaid(invoiceId: number): Promise<number> {
    // This will need to be injected from payments service or calculated via raw query
    const result = await this.invoiceRepository.manager.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE "invoiceId" = $1`,
      [invoiceId]
    );
    return parseFloat(result[0]?.total || '0');
  }

  async findAll(limit = 100): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer', 'supplier', 'items'],
    });
  }

  async findOne(id: number): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items'],
    });
  }

  async create(createInvoiceDto: CreateInvoiceDTO): Promise<Invoice> {
    // Generate invoice number
    const lastInvoice = await this.invoiceRepository.find({
      order: { id: 'DESC' },
      take: 1,
    });
    const nextNumber = lastInvoice.length > 0 ? parseInt(lastInvoice[0].invoiceNumber.split('-')[1]) + 1 : 1;
    const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const items = createInvoiceDto.items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountType === 1 
        ? itemSubtotal * (item.discount / 100) 
        : item.discount;
      const itemTotal = itemSubtotal - discountAmount;
      subtotal += itemTotal;
      
      return {
        ...item,
        total: itemTotal,
        tax: item.tax || 0,
      };
    });

    // Calculate global discount and tax
    const globalDiscountAmount = createInvoiceDto.discountType === 1
      ? subtotal * (createInvoiceDto.discount / 100)
      : createInvoiceDto.discount;
    const subtotalAfterDiscount = subtotal - globalDiscountAmount;
    const taxAmount = subtotalAfterDiscount * (createInvoiceDto.tax / 100);
    const total = subtotalAfterDiscount + taxAmount;

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      customerId: createInvoiceDto.customerId,
      customerName: createInvoiceDto.customerName,
      customerPhone: createInvoiceDto.customerPhone,
      customerAddress: createInvoiceDto.customerAddress,
      supplierId: createInvoiceDto.supplierId,
      supplierName: createInvoiceDto.supplierName,
      supplierPhone: createInvoiceDto.supplierPhone,
      supplierAddress: createInvoiceDto.supplierAddress,
      date: new Date(createInvoiceDto.date),
      dueDate: createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : undefined,
      subtotal,
      tax: createInvoiceDto.tax,
      discount: createInvoiceDto.discount,
      discountType: createInvoiceDto.discountType,
      total,
      notes: createInvoiceDto.notes,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items
    const invoiceItems = items.map(item =>
      this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax,
        total: item.total,
      }),
    );

    await this.invoiceItemRepository.save(invoiceItems);

    // Update invoice status based on items
    const status = await this.calculateInvoiceStatus(savedInvoice.id);
    await this.invoiceRepository.update(savedInvoice.id, { status });

    const result = await this.findOne(savedInvoice.id);
    if (!result) {
      throw new Error('Failed to create invoice');
    }
    return result;
  }

  async update(id: number, updateInvoiceDto: Partial<CreateInvoiceDTO>): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // If items are being updated, delete old items and create new ones
    if (updateInvoiceDto.items) {
      await this.invoiceItemRepository.delete({ invoiceId: id });

      // Calculate totals
      let subtotal = 0;
      const items = updateInvoiceDto.items.map(item => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1 
          ? itemSubtotal * (item.discount / 100) 
          : item.discount;
        const itemTotal = itemSubtotal - discountAmount;
        subtotal += itemTotal;
        
        return {
          ...item,
          total: itemTotal,
          tax: item.tax || 0,
        };
      });

      const globalDiscountAmount = (updateInvoiceDto.discountType ?? invoice.discountType) === 1
        ? subtotal * ((updateInvoiceDto.discount ?? invoice.discount) / 100)
        : (updateInvoiceDto.discount ?? invoice.discount);
      const subtotalAfterDiscount = subtotal - globalDiscountAmount;
      const taxAmount = subtotalAfterDiscount * ((updateInvoiceDto.tax ?? invoice.tax) / 100);
      const total = subtotalAfterDiscount + taxAmount;

      // Update invoice
      await this.invoiceRepository.update(id, {
        ...updateInvoiceDto,
        date: updateInvoiceDto.date ? new Date(updateInvoiceDto.date) : invoice.date,
        dueDate: updateInvoiceDto.dueDate ? new Date(updateInvoiceDto.dueDate) : invoice.dueDate,
        subtotal,
        total,
      });

      // Create new items
      const invoiceItems = items.map(item =>
        this.invoiceItemRepository.create({
          invoiceId: id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
          total: item.total,
        }),
      );

      await this.invoiceItemRepository.save(invoiceItems);

      // Update invoice status based on items
      const status = await this.calculateInvoiceStatus(id);
      await this.invoiceRepository.update(id, { status });
    } else {
      // Update invoice without items
      await this.invoiceRepository.update(id, {
        ...updateInvoiceDto,
        date: updateInvoiceDto.date ? new Date(updateInvoiceDto.date) : undefined,
        dueDate: updateInvoiceDto.dueDate ? new Date(updateInvoiceDto.dueDate) : undefined,
      });
    }

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Invoice not found after update');
    }
    return result;
  }

  async remove(id: number): Promise<void> {
    await this.invoiceItemRepository.delete({ invoiceId: id });
    await this.invoiceRepository.delete(id);
  }
}
