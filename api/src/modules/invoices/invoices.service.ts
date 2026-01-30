import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceItem, InvoiceStatus } from './entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';

interface CreateInvoiceItemDTO {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax?: number;
  total?: number;
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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configurationsService: ConfigurationsService,
  ) {}

  private async calculateInvoiceStatus(
    invoiceId: number,
  ): Promise<InvoiceStatus> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items'],
    });

    if (!invoice) {
      return InvoiceStatus.DRAFT;
    }

    // If not validated, always DRAFT
    if (!invoice.isValidated) {
      return InvoiceStatus.DRAFT;
    }

    // Check payment status using paidAmount field
    const totalPaid = parseFloat(invoice.paidAmount?.toString() || '0');
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
      [invoiceId],
    );
    return parseFloat(result[0]?.total || '0');
  }

  private async getOrCreateSequence(entityType: string): Promise<any> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');

      const sequences = config?.values?.sequences || [];
      let sequence = sequences.find(
        (seq) => seq.entityType === entityType && seq.isActive,
      );

      if (!sequence) {
        // Create default sequence for invoice_sale
        const now = new Date();
        const defaultSequence = {
          id: this.generateSequenceId(),
          name: `Sequence ${entityType}`,
          entityType,
          prefix: 'FA',
          suffix: '',
          nextNumber: 1,
          numberLength: 4,
          isActive: true,
          yearInPrefix: true,
          monthInPrefix: false,
          dayInPrefix: false,
          trimesterInPrefix: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        sequences.push(defaultSequence);
        await this.configurationsService.update(config.id, {
          values: { sequences },
        });

        sequence = defaultSequence;
      }

      return sequence;
    } catch (error) {
      // Fallback to default if configurations service fails
      const now = new Date();
      return {
        id: 'fallback',
        name: 'Default Sequence',
        entityType,
        prefix: 'FA',
        suffix: '',
        nextNumber: 1,
        numberLength: 4,
        isActive: true,
        yearInPrefix: true,
        monthInPrefix: false,
        dayInPrefix: false,
        trimesterInPrefix: false,
      };
    }
  }

  private generateSequenceId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private buildSequencePattern(sequence: any): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    const currentMonth = now.getMonth() + 1;
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '04'
          : currentMonth <= 9
            ? '07'
            : '10';

    let pattern = sequence.prefix || '';
    let dateComponents: string[] = [];

    if (sequence.yearInPrefix) {
      dateComponents.push(year.toString());
    }

    if (sequence.trimesterInPrefix && sequence.monthInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.trimesterInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.monthInPrefix) {
      dateComponents.push(month);
    }

    if (sequence.dayInPrefix) {
      dateComponents.push(day);
    }

    if (pattern && dateComponents.length > 0) {
      pattern += ' ';
    }

    if (dateComponents.length > 0) {
      pattern += dateComponents.join('-') + '-';
    }

    return pattern;
  }

  private generateSequenceNumber(sequence: any): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Calculate trimester (Q1=01, Q2=04, Q3=07, Q4=10)
    const currentMonth = now.getMonth() + 1;
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '04'
          : currentMonth <= 9
            ? '07'
            : '10';

    let result = sequence.prefix || '';
    let dateComponents: string[] = [];

    if (sequence.yearInPrefix) {
      dateComponents.push(year.toString());
    }

    if (sequence.trimesterInPrefix && sequence.monthInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.trimesterInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.monthInPrefix) {
      dateComponents.push(month);
    }

    if (sequence.dayInPrefix) {
      dateComponents.push(day);
    }

    if (result && dateComponents.length > 0) {
      result += ' ';
    }

    if (dateComponents.length > 0) {
      result += dateComponents.join('-') + '-';
    }

    const numberPart = sequence.nextNumber
      .toString()
      .padStart(sequence.numberLength || 4, '0');
    result += numberPart;
    result += sequence.suffix || '';

    return result;
  }

  private async updateSequenceNextNumber(
    entityType: string,
    sequence: any,
  ): Promise<void> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];
      const sequenceIndex = sequences.findIndex(
        (seq) => seq.id === sequence.id,
      );

      if (sequenceIndex !== -1) {
        sequences[sequenceIndex].nextNumber = sequence.nextNumber + 1;
        sequences[sequenceIndex].updatedAt = new Date().toISOString();

        await this.configurationsService.update(config.id, {
          values: { sequences },
        });
      }
    } catch (error) {
      console.error('Failed to update sequence next number:', error);
      // Continue execution even if sequence update fails
    }
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
    // Generate simple provisional invoice number: PROV1, PROV2, PROV3, etc.
    const lastProvisional = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('invoice.id', 'DESC')
      .limit(1)
      .getOne();

    let nextProvisionalNumber = 1;
    if (lastProvisional) {
      const match = lastProvisional.invoiceNumber.match(/PROV(\d+)/);
      if (match) {
        nextProvisionalNumber = parseInt(match[1]) + 1;
      }
    }
    const provisionalNumber = `PROV${nextProvisionalNumber}`;

    const invoice = await this.createInvoiceWithNumber(
      createInvoiceDto,
      provisionalNumber,
    );
    return invoice;
  }

  private async createInvoiceWithNumber(
    createInvoiceDto: CreateInvoiceDTO,
    invoiceNumber: string,
  ): Promise<Invoice> {
    // Use values from frontend directly (no recalculation)
    const items = createInvoiceDto.items.map((item) => {
      return {
        ...item,
        total: item.total || 0,
        tax: item.tax || 0,
      };
    });

    // Create invoice with provisional number and draft status
    // Values (subtotal, tax, total, discount) come directly from frontend
    const invoice = this.invoiceRepository.create({
      documentNumber: invoiceNumber,
      customerId: createInvoiceDto.customerId,
      customerName: createInvoiceDto.customerName,
      customerPhone: createInvoiceDto.customerPhone,
      customerAddress: createInvoiceDto.customerAddress,
      supplierId: createInvoiceDto.supplierId,
      supplierName: createInvoiceDto.supplierName,
      supplierPhone: createInvoiceDto.supplierPhone,
      supplierAddress: createInvoiceDto.supplierAddress,
      date: new Date(createInvoiceDto.date),
      dueDate: createInvoiceDto.dueDate
        ? new Date(createInvoiceDto.dueDate)
        : undefined,
      subtotal: 0,
      tax: createInvoiceDto.tax,
      discount: createInvoiceDto.discount,
      discountType: createInvoiceDto.discountType,
      total: 0,
      notes: createInvoiceDto.notes,
      status: InvoiceStatus.DRAFT,
      isValidated: false,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Validate minimum prices for items with productId
    for (const item of createInvoiceDto.items) {
      if (item.productId) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
        });
        if (
          product &&
          product.minPrice > 0 &&
          item.unitPrice < product.minPrice
        ) {
          throw new BadRequestException(
            `Unit price ${item.unitPrice} is below minimum price ${product.minPrice} for product "${product.name}"`,
          );
        }
      }
    }

    // Create invoice items
    const invoiceItems = items.map((item) =>
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

    // Return the created invoice with items
    const result = await this.findOne(savedInvoice.id);
    if (!result) {
      throw new Error('Failed to create invoice');
    }
    return result;
  }

  async update(
    id: number,
    updateInvoiceDto: Partial<CreateInvoiceDTO>,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Prevent updates to validated invoices
    if (invoice.isValidated) {
      throw new BadRequestException(
        'Cannot update a validated invoice. Please devalidate it first.',
      );
    }

    try {
      // If items are being updated, handle item replacement
      if (updateInvoiceDto.items && Array.isArray(updateInvoiceDto.items)) {
        // Validate that we have items
        if (updateInvoiceDto.items.length === 0) {
          throw new BadRequestException(
            'Cannot update invoice with empty items array',
          );
        }

        // Use values from frontend directly (no recalculation)
        const items = updateInvoiceDto.items.map((item) => {
          return {
            ...item,
            total: item.total || 0,
            tax: item.tax || 0,
          };
        });

        // Delete old items
        await this.invoiceItemRepository.delete({ invoiceId: id });
        console.log(`Deleted old items for invoice ${id}`);

        // Create new items
        // Validate minimum prices for items with productId
        for (const item of items) {
          if (item.productId) {
            const product = await this.productRepository.findOne({
              where: { id: item.productId },
            });
            if (
              product &&
              product.minPrice > 0 &&
              item.unitPrice < product.minPrice
            ) {
              throw new BadRequestException(
                `Unit price ${item.unitPrice} is below minimum price ${product.minPrice} for product "${product.name}"`,
              );
            }
          }
        }

        const invoiceItems = items.map((item) =>
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

        // Prepare invoice update data (exclude items)
        const { items: _, ...invoiceUpdateData } = updateInvoiceDto;

        // Update invoice with values from frontend
        await this.invoiceRepository.update(id, {
          ...invoiceUpdateData,
          date: updateInvoiceDto.date
            ? new Date(updateInvoiceDto.date)
            : invoice.date,
          dueDate: updateInvoiceDto.dueDate
            ? new Date(updateInvoiceDto.dueDate)
            : invoice.dueDate,
        });
      } else {
        // Update invoice without items
        await this.invoiceRepository.update(id, {
          ...updateInvoiceDto,
          date: updateInvoiceDto.date
            ? new Date(updateInvoiceDto.date)
            : undefined,
          dueDate: updateInvoiceDto.dueDate
            ? new Date(updateInvoiceDto.dueDate)
            : undefined,
        });
      }

      // Return the updated invoice
      const result = await this.findOne(id);
      if (!result) {
        throw new NotFoundException('Invoice not found after update');
      }

      return result;
    } catch (error) {
      console.error(`Error updating invoice ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    // Check if invoice has payments
    const totalPaid = await this.getTotalPaid(id);
    if (totalPaid > 0) {
      throw new Error('Cannot delete invoice that has payments.');
    }

    await this.invoiceItemRepository.delete({ invoiceId: id });
    await this.invoiceRepository.delete(id);
  }

  async validate(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.isValidated) {
      throw new BadRequestException('Invoice is already validated');
    }

    let finalInvoiceNumber = invoice.documentNumber;

    // Only generate a new number if this is the first validation (provisional number)
    if (invoice.documentNumber.startsWith('PROV')) {
      // Get sequence for invoice_sale
      const sequence = await this.getOrCreateSequence('invoice_sale');

      // Use the sequence's next document number directly
      finalInvoiceNumber = this.generateSequenceNumber(sequence);

      // Increment sequence next number
      await this.updateSequenceNextNumber('invoice_sale', sequence);
    }

    // Update invoice with final number (or keep existing) and validated status
    await this.invoiceRepository.update(id, {
      documentNumber: finalInvoiceNumber,
      isValidated: true,
      validationDate: new Date(),
      status: InvoiceStatus.UNPAID,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new NotFoundException('Invoice not found after validation');
    }
    return result;
  }

  async devalidate(id: number): Promise<Invoice> {
    // Find the invoice
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if the invoice is validated
    if (!invoice.isValidated) {
      throw new BadRequestException('Invoice is not validated');
    }

    // Update sequence nextNumber to match the last document in database
    try {
      const sequence = await this.getOrCreateSequence('invoice_sale');
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];
      const sequenceIndex = sequences.findIndex((seq) => seq.id === sequence.id);
      
      if (sequenceIndex !== -1) {
        // Find the highest document number in database with this sequence pattern
        const pattern = this.buildSequencePattern(sequence);
        const lastInvoice = await this.invoiceRepository
          .createQueryBuilder('invoice')
          .where('invoice.documentNumber LIKE :pattern', { pattern: pattern + '%' })
          .andWhere('invoice.isValidated = :validated', { validated: true })
          .orderBy('CAST(SUBSTRING(invoice.documentNumber FROM \'[0-9]+$\') AS INTEGER)', 'DESC')
          .limit(1)
          .getOne();

        let nextNumber = 1;
        if (lastInvoice) {
          const match = lastInvoice.documentNumber.match(/(\d+)$/);
          if (match) {
            nextNumber = parseInt(match[1]);
          }
        }

        sequences[sequenceIndex].nextNumber = nextNumber;
        sequences[sequenceIndex].updatedAt = new Date().toISOString();
        
        await this.configurationsService.update(config.id, {
          values: { sequences },
        });
      }
    } catch (error) {
      console.error('Error updating sequence during devalidation:', error);
      // Continue with devalidation even if sequence update fails
    }

    // Generate new provisional number (PROV format)
    // If already has a PROV number, keep it to avoid duplicates
    let nextProvNumber: string;
    if (invoice.documentNumber.startsWith('PROV')) {
      nextProvNumber = invoice.documentNumber;
    } else {
      // Find all PROV numbers to get the maximum
      const allProvInvoices = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('invoice.documentNumber')
        .where('invoice.documentNumber LIKE :pattern', { pattern: 'PROV%' })
        .andWhere('invoice.id != :currentId', { currentId: id })
        .getMany();

      let maxProvNumber = 0;
      for (const provInvoice of allProvInvoices) {
        const match = provInvoice.documentNumber.match(/PROV(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxProvNumber) {
            maxProvNumber = num;
          }
        }
      }

      nextProvNumber = `PROV${maxProvNumber + 1}`;
    }

    // Update invoice back to draft status with new provisional number
    await this.invoiceRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: InvoiceStatus.DRAFT,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new NotFoundException('Invoice not found after devalidation');
    }
    return result;
  }
}
