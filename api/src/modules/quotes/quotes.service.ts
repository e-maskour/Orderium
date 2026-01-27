import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteItem, QuoteStatus } from './entities/quote.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';
import { InvoicesService } from '../invoices/invoices.service';

interface CreateQuoteItemDTO {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax?: number;
}

interface CreateQuoteDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  expirationDate?: string;
  items: CreateQuoteItemDTO[];
  tax: number;
  discount: number;
  discountType: number;
  notes?: string;
}

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configurationsService: ConfigurationsService,
  ) {}

  private async getOrCreateSequence(entityType: string): Promise<any> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];

      let sequence = sequences.find(
        (seq) => seq.entityType === entityType && seq.isActive,
      );

      if (!sequence) {
        // Create default sequence for quotes
        const now = new Date();
        const defaultSequence = {
          id: this.generateSequenceId(),
          name: `Sequence ${entityType}`,
          entityType,
          prefix: 'DV',
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
      return {
        id: 'fallback',
        name: 'Default Sequence',
        entityType,
        prefix: 'DV',
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

  private generateSequenceNumber(sequence: any): string {
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
    }
  }

  async findAll(limit = 100): Promise<Quote[]> {
    return this.quoteRepository.find({
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer', 'items'],
    });
  }

  async findOne(id: number): Promise<Quote | null> {
    return this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
  }

  async create(createQuoteDto: CreateQuoteDTO): Promise<Quote> {
    // Generate simple provisional quote number: PROV1, PROV2, PROV3, etc.
    const lastProvisional = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('quote.id', 'DESC')
      .limit(1)
      .getOne();

    let nextProvisionalNumber = 1;
    if (lastProvisional) {
      const match = lastProvisional.quoteNumber.match(/PROV(\d+)/);
      if (match) {
        nextProvisionalNumber = parseInt(match[1]) + 1;
      }
    }
    const provisionalNumber = `PROV${nextProvisionalNumber}`;

    const quote = await this.createQuoteWithNumber(
      createQuoteDto,
      provisionalNumber,
    );
    return quote;
  }

  private async createQuoteWithNumber(
    createQuoteDto: CreateQuoteDTO,
    quoteNumber: string,
  ): Promise<Quote> {
    // Calculate totals
    let subtotal = 0;
    const items = createQuoteDto.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount =
        item.discountType === 1
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
    const globalDiscountAmount =
      createQuoteDto.discountType === 1
        ? subtotal * (createQuoteDto.discount / 100)
        : createQuoteDto.discount;
    const subtotalAfterDiscount = subtotal - globalDiscountAmount;
    const taxAmount = subtotalAfterDiscount * (createQuoteDto.tax / 100);
    const total = subtotalAfterDiscount + taxAmount;

    // Create quote with provisional number and draft status
    const quote = this.quoteRepository.create({
      documentNumber: quoteNumber,
      customerId: createQuoteDto.customerId,
      customerName: createQuoteDto.customerName,
      customerPhone: createQuoteDto.customerPhone,
      customerAddress: createQuoteDto.customerAddress,
      date: new Date(createQuoteDto.date),
      expirationDate: createQuoteDto.expirationDate
        ? new Date(createQuoteDto.expirationDate)
        : undefined,
      subtotal,
      tax: createQuoteDto.tax,
      discount: createQuoteDto.discount,
      discountType: createQuoteDto.discountType,
      total,
      notes: createQuoteDto.notes,
      status: QuoteStatus.DRAFT,
      isValidated: false,
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Validate minimum prices for items with productId
    for (const item of createQuoteDto.items) {
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

    // Create quote items
    const quoteItems = items.map((item) =>
      this.quoteItemRepository.create({
        quoteId: savedQuote.id,
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

    await this.quoteItemRepository.save(quoteItems);

    // Return the created quote with items
    const result = await this.findOne(savedQuote.id);
    if (!result) {
      throw new Error('Failed to create quote');
    }
    return result;
  }

  async update(
    id: number,
    updateQuoteDto: Partial<CreateQuoteDTO>,
  ): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Prevent updates to validated quotes or converted quotes
    if (quote.isValidated) {
      throw new BadRequestException(
        'Cannot update a validated quote. Please devalidate it first.',
      );
    }

    if (quote.status === QuoteStatus.INVOICED) {
      throw new BadRequestException(
        'Cannot update a quote that has been converted to an invoice.',
      );
    }

    try {
      // If items are being updated, handle item replacement
      if (updateQuoteDto.items && Array.isArray(updateQuoteDto.items)) {
        if (updateQuoteDto.items.length === 0) {
          throw new BadRequestException(
            'Cannot update quote with empty items array',
          );
        }

        // Calculate totals
        let subtotal = 0;
        const items = updateQuoteDto.items.map((item) => {
          const itemSubtotal = item.quantity * item.unitPrice;
          const discountAmount =
            item.discountType === 1
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

        const globalDiscountAmount =
          (updateQuoteDto.discountType ?? quote.discountType ?? 0) === 1
            ? subtotal *
              ((updateQuoteDto.discount ?? quote.discount ?? 0) / 100)
            : (updateQuoteDto.discount ?? quote.discount ?? 0);
        const subtotalAfterDiscount = subtotal - globalDiscountAmount;
        const taxAmount =
          subtotalAfterDiscount *
          ((updateQuoteDto.tax ?? quote.tax ?? 0) / 100);
        const total = subtotalAfterDiscount + taxAmount;

        // Delete old items
        await this.quoteItemRepository.delete({ quoteId: id });

        // Create new items
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

        const quoteItems = items.map((item) =>
          this.quoteItemRepository.create({
            quoteId: id,
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

        await this.quoteItemRepository.save(quoteItems);

        // Prepare quote update data (exclude items)
        const { items: _, ...quoteUpdateData } = updateQuoteDto;

        // Update quote with new totals
        await this.quoteRepository.update(id, {
          ...quoteUpdateData,
          date: updateQuoteDto.date
            ? new Date(updateQuoteDto.date)
            : quote.date,
          expirationDate: updateQuoteDto.expirationDate
            ? new Date(updateQuoteDto.expirationDate)
            : quote.expirationDate,
          subtotal,
          total,
        });
      } else {
        // Update quote without items
        await this.quoteRepository.update(id, {
          ...updateQuoteDto,
          date: updateQuoteDto.date ? new Date(updateQuoteDto.date) : undefined,
          expirationDate: updateQuoteDto.expirationDate
            ? new Date(updateQuoteDto.expirationDate)
            : undefined,
        });
      }

      // Return the updated quote
      const result = await this.findOne(id);
      if (!result) {
        throw new NotFoundException('Quote not found after update');
      }

      return result;
    } catch (error) {
      console.error(`Error updating quote ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status === QuoteStatus.INVOICED) {
      throw new BadRequestException(
        'Cannot delete a quote that has been converted to an invoice',
      );
    }

    await this.quoteItemRepository.delete({ quoteId: id });
    await this.quoteRepository.delete(id);
  }

  async validate(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.isValidated) {
      throw new BadRequestException('Quote is already validated');
    }

    try {
      // Get or create sequence for quotes
      const sequence = await this.getOrCreateSequence('quote');

      // Generate final quote number using sequence
      const finalQuoteNumber = this.generateSequenceNumber(sequence);

      // Update quote with final number and validated status
      await this.quoteRepository.update(id, {
        documentNumber: finalQuoteNumber,
        isValidated: true,
        status: QuoteStatus.OPEN,
      });

      // Update sequence next number
      await this.updateSequenceNextNumber('quote', sequence);

      const result = await this.findOne(id);
      if (!result) {
        throw new Error('Quote not found after validation');
      }
      return result;
    } catch (error) {
      console.error(
        'Error in sequence-based validation, falling back to old system:',
        error,
      );

      // Fallback to old system if sequence fails
      const lastQuote = await this.quoteRepository
        .createQueryBuilder('quote')
        .where('quote.documentNumber LIKE :pattern', { pattern: 'DV-%' })
        .orderBy('quote.id', 'DESC')
        .limit(1)
        .getOne();

      let nextNumber = 1;
      if (lastQuote) {
        const match = lastQuote.quoteNumber.match(/DV-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      const finalQuoteNumber = `DV-${String(nextNumber).padStart(5, '0')}`;

      await this.quoteRepository.update(id, {
        documentNumber: finalQuoteNumber,
        isValidated: true,
        status: QuoteStatus.OPEN,
      });

      const result = await this.findOne(id);
      if (!result) {
        throw new Error('Quote not found after validation');
      }
      return result;
    }
  }

  async devalidate(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!quote.isValidated) {
      throw new BadRequestException('Quote is not validated');
    }

    if (quote.status === QuoteStatus.INVOICED) {
      throw new BadRequestException(
        'Cannot devalidate a quote that has been converted to an invoice',
      );
    }

    // Generate new provisional number (PROV format)
    const lastProvNumber = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('quote.id', 'DESC')
      .limit(1)
      .getOne();

    let nextProvNumber: string;
    if (lastProvNumber) {
      const match = lastProvNumber.quoteNumber.match(/PROV(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        nextProvNumber = `PROV${lastNumber + 1}`;
      } else {
        nextProvNumber = 'PROV1';
      }
    } else {
      nextProvNumber = 'PROV1';
    }

    // Update quote back to draft status with new provisional number
    await this.quoteRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      status: QuoteStatus.DRAFT,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after devalidation');
    }
    return result;
  }

  async accept(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.OPEN) {
      throw new BadRequestException('Only open quotes can be accepted');
    }

    await this.quoteRepository.update(id, {
      status: QuoteStatus.SIGNED,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after acceptance');
    }
    return result;
  }

  async reject(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.OPEN) {
      throw new BadRequestException('Only open quotes can be rejected');
    }

    await this.quoteRepository.update(id, {
      status: QuoteStatus.CLOSED,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after rejection');
    }
    return result;
  }

  async generateShareLink(id: number): Promise<{ shareToken: string; expiresAt: Date }> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!quote.isValidated || quote.status === QuoteStatus.DRAFT) {
      throw new BadRequestException('Only validated quotes can be shared');
    }

    // Generate random token
    const shareToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15) + 
                       Date.now().toString(36);
    
    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.quoteRepository.update(id, {
      shareToken,
      shareTokenExpiry: expiresAt,
    });

    return { shareToken, expiresAt };
  }

  async getByShareToken(token: string): Promise<Quote> {
    const quote = await this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('quote.shareToken = :token', { token })
      .getOne();

    if (!quote) {
      throw new NotFoundException('Quote not found or link has expired');
    }

    // Check if token has expired
    if (quote.shareTokenExpiry && new Date() > new Date(quote.shareTokenExpiry)) {
      throw new BadRequestException('This quote link has expired');
    }

    return quote;
  }

  async signQuote(token: string, signedBy: string, clientNotes?: string): Promise<Quote> {
    const quote = await this.getByShareToken(token);

    if (quote.status !== QuoteStatus.OPEN) {
      throw new BadRequestException('This quote cannot be signed');
    }

    await this.quoteRepository.update(quote.id, {
      status: QuoteStatus.SIGNED,
      signedBy,
      signedDate: new Date(),
      clientNotes: clientNotes || null,
    });

    const result = await this.findOne(quote.id);
    if (!result) {
      throw new Error('Quote not found after signing');
    }
    return result;
  }

  async unsignQuote(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.SIGNED) {
      throw new BadRequestException('Only signed quotes can be refused');
    }

    await this.quoteRepository.update(id, {
      status: QuoteStatus.CLOSED,
      signedBy: null,
      signedDate: null,
      clientNotes: null,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after refusing');
    }
    return result;
  }

  /**
   * Mark quote as converted to order (bon de livraison)
   */
  async convertToOrder(id: number, orderId: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.SIGNED) {
      throw new BadRequestException('Only signed quotes can be converted');
    }

    // Determine new status based on existing conversions
    let newStatus: QuoteStatus;
    if (quote.convertedToInvoiceId) {
      // Already converted to invoice, so now converted to both
      newStatus = QuoteStatus.INVOICED;
    } else {
      // Only converted to order
      newStatus = QuoteStatus.DELIVERED;
    }

    await this.quoteRepository.update(id, {
      convertedToOrderId: orderId,
      status: newStatus,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after conversion');
    }
    return result;
  }

  /**
   * Mark quote as converted to invoice (facture)
   */
  async convertToInvoice(id: number, invoiceId: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.SIGNED) {
      throw new BadRequestException('Only signed quotes can be converted');
    }

    // Always set to INVOICED when converting to invoice (regardless of bon conversion)
    await this.quoteRepository.update(id, {
      convertedToInvoiceId: invoiceId,
      status: QuoteStatus.INVOICED,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after conversion');
    }
    return result;
  }
}
