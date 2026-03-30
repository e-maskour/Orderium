import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as XLSX from 'xlsx';
import { Quote, QuoteItem, QuoteStatus } from './entities/quote.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';
import { SequenceConfig } from '../../common/types/sequence-config.interface';
import { PDFService } from '../pdf/pdf.service';
import { PdfQueueService } from '../pdf/pdf.queue.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateQuoteDto, QuoteItemDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly pdfQueueService: PdfQueueService,
  ) { }

  private get quoteRepository(): Repository<Quote> {
    return this.tenantConnService.getRepository(Quote);
  }

  private get quoteItemRepository(): Repository<QuoteItem> {
    return this.tenantConnService.getRepository(QuoteItem);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private async getOrCreateSequence(
    entityType: string,
    documentDate?: string | Date,
  ): Promise<SequenceConfig> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];

      let sequence = sequences.find(
        (seq) => seq.entityType === entityType && seq.isActive,
      );

      if (!sequence) {
        // Create default sequence with appropriate prefix
        const now = new Date();
        let prefix = 'DV'; // Default for quote
        if (entityType === 'price_request') {
          prefix = 'DP';
        }

        const defaultSequence = {
          id: this.generateSequenceId(),
          name: `Sequence ${entityType}`,
          entityType,
          prefix,
          suffix: '',
          nextNumber: 1,
          numberLength: 4,
          isActive: true,
          yearInPrefix: true,
          monthInPrefix: true,
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

      // Sync sequence with actual database to handle deleted documents
      await this.syncSequenceWithDatabase(sequence, documentDate);

      return sequence;
    } catch {
      // Fallback to default if configurations service fails
      let prefix = 'DV'; // Default for quote
      if (entityType === 'price_request') {
        prefix = 'DP';
      }

      return {
        id: 'fallback',
        name: 'Default Sequence',
        entityType,
        prefix,
        suffix: '',
        nextNumber: 1,
        numberLength: 4,
        isActive: true,
        yearInPrefix: true,
        monthInPrefix: true,
        dayInPrefix: false,
        trimesterInPrefix: false,
      };
    }
  }

  private generateSequenceId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private async syncSequenceWithDatabase(
    sequence: SequenceConfig,
    documentDate?: string | Date,
  ): Promise<void> {
    try {
      // Build the current pattern for this sequence using document date (e.g., "DV 2026-02-")
      const pattern = this.buildSequencePattern(sequence, documentDate);

      // Find all quotes with document numbers matching this pattern
      const quotes = await this.quoteRepository
        .createQueryBuilder('quote')
        .where('quote.documentNumber LIKE :pattern', {
          pattern: `${pattern}%`,
        })
        .andWhere('quote.documentNumber NOT LIKE :provisional', {
          provisional: 'PROV%',
        })
        .getMany();

      if (quotes.length === 0) {
        // No quotes found for this pattern, reset to 1
        sequence.nextNumber = 1;
        return;
      }

      // Extract all sequence numbers from the quotes
      const numbers = quotes
        .map((quote) => {
          // Remove the pattern prefix to get just the number part
          const numberPart = quote.documentNumber.replace(pattern, '');
          // Remove any suffix
          const cleanNumber = numberPart.replace(sequence.suffix || '', '');
          return parseInt(cleanNumber, 10);
        })
        .filter((num) => !isNaN(num));

      if (numbers.length === 0) {
        sequence.nextNumber = 1;
        return;
      }

      // Set nextNumber to max + 1
      const maxNumber = Math.max(...numbers);
      sequence.nextNumber = maxNumber + 1;
    } catch (error) {
      this.logger.error(
        'Failed to sync sequence with database',
        (error as Error)?.stack,
      );
      // Keep existing nextNumber if sync fails
    }
  }

  private buildSequencePattern(
    sequence: SequenceConfig,
    documentDate?: string | Date,
  ): string {
    // Use document date if provided, otherwise fallback to current date
    const now = documentDate ? new Date(documentDate) : new Date();
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
    const dateComponents: string[] = [];

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

  private buildFormatPattern(sequence: SequenceConfig): string {
    let result = sequence.prefix || '';
    const dateComponents: string[] = [];

    if (sequence.yearInPrefix) {
      dateComponents.push('YYYY');
    }

    if (sequence.trimesterInPrefix && sequence.monthInPrefix) {
      dateComponents.push('QQ');
    } else if (sequence.trimesterInPrefix) {
      dateComponents.push('QQ');
    } else if (sequence.monthInPrefix) {
      dateComponents.push('MM');
    }

    if (sequence.dayInPrefix) {
      dateComponents.push('DD');
    }

    if (result && dateComponents.length > 0) {
      result += ' ';
    }

    if (dateComponents.length > 0) {
      result += dateComponents.join('-') + '-';
    }

    const numberPart = 'X'.repeat(sequence.numberLength || 4);
    result += numberPart;
    result += sequence.suffix || '';

    return result;
  }

  private enrichSequenceForResponse(
    sequence: SequenceConfig,
  ): SequenceConfig & { format: string; nextDocumentNumber: string } {
    return {
      ...sequence,
      format: this.buildFormatPattern(sequence),
      nextDocumentNumber: this.generateSequenceNumber(sequence),
    };
  }

  private generateSequenceNumber(
    sequence: SequenceConfig,
    documentDate?: string | Date,
  ): string {
    // Use document date if provided, otherwise fallback to current date
    const now = documentDate ? new Date(documentDate) : new Date();
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
    const dateComponents: string[] = [];

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
    sequence: SequenceConfig,
  ): Promise<void> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
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
      this.logger.error(
        'Failed to update sequence next number',
        (error as Error)?.stack,
      );
    }
  }

  async findAll(
    search?: string,
    status?: string,
    customerId?: number,
    dateFrom?: string,
    dateTo?: string,
    page?: number,
    pageSize?: number,
    supplierId?: number,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{ quotes: Quote[]; count: number; totalCount: number }> {
    const queryBuilder = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.supplier', 'supplier')
      .leftJoinAndSelect('quote.items', 'items');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(quote.quoteNumber ILIKE :search OR customer.name ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('quote.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('quote.customerId = :customerId', { customerId });
    }

    if (supplierId) {
      queryBuilder.andWhere('quote.supplierId = :supplierId', { supplierId });
    }

    if (direction) {
      queryBuilder.andWhere('quote.direction = :direction', { direction });
    }

    if (dateFrom) {
      queryBuilder.andWhere('quote.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('quote.date <= :dateTo', { dateTo });
    }

    queryBuilder.orderBy('quote.dateCreated', 'DESC');

    // Get total count before pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination if provided
    if (page && pageSize) {
      queryBuilder.skip((page - 1) * pageSize).take(pageSize);
    } else if (pageSize) {
      queryBuilder.take(pageSize);
    } else {
      queryBuilder.take(100); // Default limit
    }

    const quotes = await queryBuilder.getMany();

    return {
      quotes,
      count: quotes.length,
      totalCount,
    };
  }

  private async invalidateQuoteCache(id?: number) {
    if (id) await this.cacheManager.del(`quote:${id}`);
  }

  async findOne(id: number): Promise<Quote | null> {
    const cacheKey = `quote:${id}`;
    const cached = await this.cacheManager.get<Quote>(cacheKey);
    if (cached) return cached;

    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items'],
    });
    if (quote) {
      await this.cacheManager.set(cacheKey, quote, 300_000);
    }
    return quote;
  }

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
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
    createQuoteDto: CreateQuoteDto,
    quoteNumber: string,
  ): Promise<Quote> {
    // Use values from frontend directly (no recalculation)
    const items = (createQuoteDto.items ?? []).map((item) => {
      return {
        ...item,
        total: item.total || 0,
        tax: item.tax || 0,
      };
    });

    // Create quote with provisional number and draft status
    // Values (subtotal, tax, total, discount) come directly from frontend
    const quote = this.quoteRepository.create({
      documentNumber: quoteNumber,
      direction: createQuoteDto.supplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE,
      customerId: createQuoteDto.customerId,
      customerName: createQuoteDto.customerName,
      customerPhone: createQuoteDto.customerPhone,
      customerAddress: createQuoteDto.customerAddress,
      supplierId: createQuoteDto.supplierId,
      supplierName: createQuoteDto.supplierName,
      supplierPhone: createQuoteDto.supplierPhone,
      supplierAddress: createQuoteDto.supplierAddress,
      date: new Date(createQuoteDto.date),
      dueDate: createQuoteDto.dueDate
        ? new Date(createQuoteDto.dueDate)
        : undefined,
      expirationDate: createQuoteDto.expirationDate
        ? new Date(createQuoteDto.expirationDate)
        : undefined,
      subtotal: createQuoteDto.subtotal || 0,
      tax: createQuoteDto.tax,
      discount: createQuoteDto.discount,
      discountType: createQuoteDto.discountType,
      total: createQuoteDto.total || 0,
      notes: createQuoteDto.notes,
      status: QuoteStatus.DRAFT,
      isValidated: false,
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Validate minimum prices for items with productId (only for vente documents)
    const isVente = !createQuoteDto.supplierId;
    if (isVente) {
      for (const item of (createQuoteDto.items ?? [])) {
        if (item.productId && item.unitPrice != null) {
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
    }

    // Create quote items
    const quoteItems = items.map((item) =>
      this.quoteItemRepository.create({
        quoteId: savedQuote.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0, // Convert null to 0 for demande de prix
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax,
        total: item.total ?? 0, // Convert null to 0 for demande de prix
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
    updateQuoteDto: Partial<CreateQuoteDto>,
  ): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const finalSupplierId =
      updateQuoteDto.supplierId !== undefined
        ? updateQuoteDto.supplierId
        : quote.supplierId;
    const direction = finalSupplierId
      ? DocumentDirection.ACHAT
      : DocumentDirection.VENTE;

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

        // Use values from frontend directly (no recalculation)
        const items = updateQuoteDto.items.map((item) => {
          return {
            ...item,
            total: item.total || 0,
            tax: item.tax || 0,
          };
        });

        // Delete old items
        await this.quoteItemRepository.delete({ quoteId: id });

        // Validate minimum prices for items with productId (only for vente documents)
        const isVente = !quote.supplierId;
        if (isVente) {
          for (const item of items) {
            if (item.productId && item.unitPrice != null) {
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
        }

        const quoteItems = items.map((item) =>
          this.quoteItemRepository.create({
            quoteId: id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? 0, // Convert null to 0 for demande de prix
            discount: item.discount,
            discountType: item.discountType,
            tax: item.tax,
            total: item.total ?? 0, // Convert null to 0 for demande de prix
          }),
        );

        await this.quoteItemRepository.save(quoteItems);

        // Prepare quote update data (exclude items)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { items: _items, ...quoteUpdateData } = updateQuoteDto;

        // Update quote with values from frontend
        await this.quoteRepository.update(id, {
          ...quoteUpdateData,
          direction,
          date: updateQuoteDto.date
            ? new Date(updateQuoteDto.date)
            : quote.date,
          dueDate: updateQuoteDto.dueDate
            ? new Date(updateQuoteDto.dueDate)
            : quote.dueDate,
          expirationDate: updateQuoteDto.expirationDate
            ? new Date(updateQuoteDto.expirationDate)
            : quote.expirationDate,
        });
      } else {
        // Update quote without items - exclude items from the update
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { items: _items, ...quoteUpdateData } = updateQuoteDto;
        await this.quoteRepository.update(id, {
          ...quoteUpdateData,
          direction,
          date: updateQuoteDto.date ? new Date(updateQuoteDto.date) : undefined,
          dueDate: updateQuoteDto.dueDate
            ? new Date(updateQuoteDto.dueDate)
            : undefined,
          expirationDate: updateQuoteDto.expirationDate
            ? new Date(updateQuoteDto.expirationDate)
            : undefined,
        });
      }

      // Return the updated quote
      await this.invalidateQuoteCache(id);
      const result = await this.findOne(id);
      if (!result) {
        throw new NotFoundException('Quote not found after update');
      }
      return result;
    } catch (error) {
      this.logger.error(`Error updating quote ${id}`, (error as Error)?.stack);
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
    await this.pdfService.deletePDF(quote.pdfUrl);
    await this.quoteRepository.delete(id);
    await this.invalidateQuoteCache(id);
  }

  async validate(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.isValidated) {
      throw new BadRequestException('Quote is already validated');
    }

    let finalQuoteNumber = quote.documentNumber;

    // Only generate a new number if this is the first validation (provisional number)
    if (quote.documentNumber.startsWith('PROV')) {
      // Determine sequence type based on quote direction
      const sequenceType = quote.supplierId ? 'price_request' : 'quote';

      // Get sequence for appropriate quote type
      const sequence = await this.getOrCreateSequence(sequenceType, quote.date);

      // Use the sequence's next document number directly with quote date
      finalQuoteNumber = this.generateSequenceNumber(sequence, quote.date);

      // Increment sequence next number
      await this.updateSequenceNextNumber(sequenceType, sequence);
    }

    // Update quote with final number (or keep existing) and validated status
    await this.quoteRepository.update(id, {
      documentNumber: finalQuoteNumber,
      isValidated: true,
      validationDate: new Date(),
      status: QuoteStatus.OPEN,
    });

    // Generate PDF in background via queue (non-blocking)
    void this.pdfQueueService.enqueue('quote', id);

    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after validation');
    }
    return result;
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

    // Update sequence nextNumber to match the last document in database
    try {
      // Determine sequence type based on quote direction
      const sequenceType = quote.supplierId ? 'price_request' : 'quote';

      const sequence = await this.getOrCreateSequence(sequenceType, quote.date);
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
      const sequenceIndex = sequences.findIndex(
        (seq) => seq.id === sequence.id,
      );

      if (sequenceIndex !== -1) {
        // Find the highest document number in database with this sequence pattern
        const pattern = this.buildSequencePattern(sequence, quote.date);
        const lastQuote = await this.quoteRepository
          .createQueryBuilder('quote')
          .where('quote.documentNumber LIKE :pattern', {
            pattern: pattern + '%',
          })
          .andWhere('quote.isValidated = :validated', { validated: true })
          .orderBy(
            "CAST(SUBSTRING(quote.documentNumber FROM '[0-9]+$') AS INTEGER)",
            'DESC',
          )
          .limit(1)
          .getOne();

        let nextNumber = 1;
        if (lastQuote) {
          const match = lastQuote.documentNumber.match(/(\d+)$/);
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
      this.logger.error(
        'Error updating sequence during devalidation',
        (error as Error)?.stack,
      );
      // Continue with devalidation even if sequence update fails
    }

    // Generate new provisional number (PROV format)
    // If already has a PROV number, keep it to avoid duplicates
    let nextProvNumber: string;
    if (quote.documentNumber.startsWith('PROV')) {
      nextProvNumber = quote.documentNumber;
    } else {
      // Find all PROV numbers to get the maximum
      const allProvQuotes = await this.quoteRepository
        .createQueryBuilder('quote')
        .select('quote.documentNumber')
        .where('quote.documentNumber LIKE :pattern', { pattern: 'PROV%' })
        .andWhere('quote.id != :currentId', { currentId: id })
        .getMany();

      let maxProvNumber = 0;
      for (const provQuote of allProvQuotes) {
        const match = provQuote.documentNumber.match(/PROV(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxProvNumber) {
            maxProvNumber = num;
          }
        }
      }

      nextProvNumber = `PROV${maxProvNumber + 1}`;
    }

    // Update quote back to draft status with new provisional number
    await this.pdfService.deletePDF(quote.pdfUrl);
    await this.quoteRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: QuoteStatus.DRAFT,
      pdfUrl: null,
    });

    await this.invalidateQuoteCache(id);
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

    await this.invalidateQuoteCache(id);
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

    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after rejection');
    }
    return result;
  }

  async generateShareLink(
    id: number,
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!quote.isValidated || quote.status === QuoteStatus.DRAFT) {
      throw new BadRequestException('Only validated quotes can be shared');
    }

    // Generate random token
    const shareToken =
      Math.random().toString(36).substring(2, 15) +
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
    if (
      quote.shareTokenExpiry &&
      new Date() > new Date(quote.shareTokenExpiry)
    ) {
      throw new BadRequestException('This quote link has expired');
    }

    return quote;
  }

  async signQuote(
    token: string,
    signedBy: string,
    clientNotes?: string,
  ): Promise<Quote> {
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

    await this.invalidateQuoteCache(id);
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

    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) {
      throw new Error('Quote not found after conversion');
    }
    return result;
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    // Get all quotes for the specified year and direction
    const queryBuilder = this.quoteRepository
      .createQueryBuilder('quote')
      .andWhere('EXTRACT(YEAR FROM quote.date) = :year', { year });

    // Filter by direction (vente: customer quotes, achat: supplier quotes)
    if (direction === 'vente') {
      queryBuilder.andWhere('quote.customerId IS NOT NULL');
    } else {
      queryBuilder.andWhere('quote.supplierId IS NOT NULL');
    }

    const quotes = await queryBuilder.getMany();

    // Calculate monthly chart data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthQuotes = quotes.filter(
        (quote) => new Date(quote.date).getMonth() === monthIndex,
      );

      return {
        month: monthIndex + 1,
        count: monthQuotes.length,
        amount: monthQuotes.reduce(
          (sum, quote) => sum + Number(quote.total),
          0,
        ),
      };
    });

    // Calculate KPIs
    const totalQuotes = quotes.length;
    const totalAmount = quotes.reduce(
      (sum, quote) => sum + Number(quote.total),
      0,
    );
    const acceptedCount = quotes.filter(
      (quote) =>
        quote.status === QuoteStatus.SIGNED ||
        quote.status === QuoteStatus.INVOICED ||
        quote.status === QuoteStatus.DELIVERED,
    ).length;
    const pendingCount = quotes.filter(
      (quote) =>
        quote.status === QuoteStatus.OPEN || quote.status === QuoteStatus.DRAFT,
    ).length;
    const acceptedValue = quotes
      .filter(
        (quote) =>
          quote.status === QuoteStatus.SIGNED ||
          quote.status === QuoteStatus.INVOICED ||
          quote.status === QuoteStatus.DELIVERED,
      )
      .reduce((sum, quote) => sum + Number(quote.total), 0);
    const conversionRate =
      totalQuotes > 0 ? (acceptedCount / totalQuotes) * 100 : 0;

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalQuotes,
        totalAmount,
        acceptedCount,
        pendingCount,
        acceptedValue,
        conversionRate,
      },
    };
  }

  /**
   * Export quotes/devis to XLSX format
   */
  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const queryBuilder = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.supplier', 'supplier')
      .orderBy('quote.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        queryBuilder.where('quote.supplierId = :supplierId', { supplierId });
      } else {
        queryBuilder.where('quote.supplierId IS NULL');
      }
    }

    const quotes = await queryBuilder.getMany();

    // Flatten data for export - one row per item
    const exportData: any[] = [];

    quotes.forEach((quote) => {
      const isDemandePrix = !!quote.supplierId;
      const baseData = {
        Numéro: quote.documentNumber,
        Date: quote.date
          ? new Date(quote.date).toLocaleDateString('fr-FR')
          : '',
        'Date expiration': quote.expirationDate
          ? new Date(quote.expirationDate).toLocaleDateString('fr-FR')
          : '',
        Type: isDemandePrix ? 'Demande de prix' : 'Devis',
        'Client/Fournisseur': isDemandePrix
          ? quote.supplierName || quote.supplier?.name || ''
          : quote.customerName || quote.customer?.name || '',
        Téléphone: isDemandePrix
          ? quote.supplierPhone || ''
          : quote.customerPhone || '',
        Adresse: isDemandePrix
          ? quote.supplierAddress || quote.supplier?.address || ''
          : quote.customerAddress || quote.customer?.address || '',
        Statut: this.getQuoteStatusLabel(quote.status),
        'Sous-total': Number(quote.subtotal),
        Remise: Number(quote.discount),
        'Type remise': quote.discountType === 0 ? 'Montant' : 'Pourcentage',
        Taxe: Number(quote.tax),
        Total: Number(quote.total),
        Notes: quote.notes || '',
      };

      if (quote.items && quote.items.length > 0) {
        quote.items.forEach((item, index) => {
          exportData.push({
            ...baseData,
            Ligne: index + 1,
            'Code produit': item.product?.code || '',
            'Produit/Service': item.description,
            Quantité: Number(item.quantity),
            'Prix unitaire':
              item.unitPrice !== null ? Number(item.unitPrice) : '',
            'Remise ligne': Number(item.discount),
            'Type remise ligne':
              item.discountType === 0 ? 'Montant' : 'Pourcentage',
            'Taxe ligne (%)': Number(item.tax),
            'Total ligne': item.total !== null ? Number(item.total) : '',
          });
        });
      } else {
        exportData.push({
          ...baseData,
          Ligne: '',
          'Code produit': '',
          'Produit/Service': '',
          Quantité: '',
          'Prix unitaire': '',
          'Remise ligne': '',
          'Type remise ligne': '',
          'Taxe ligne (%)': '',
          'Total ligne': '',
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
      { wch: 8 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
    ];

    const sheetName =
      supplierId !== undefined
        ? supplierId
          ? 'Demandes de prix'
          : 'Devis'
        : 'Devis et Demandes';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  private getQuoteStatusLabel(status: QuoteStatus): string {
    const labels = {
      [QuoteStatus.DRAFT]: 'Brouillon',
      [QuoteStatus.OPEN]: 'Ouvert',
      [QuoteStatus.SIGNED]: 'Signée',
      [QuoteStatus.CLOSED]: 'Fermée',
      [QuoteStatus.DELIVERED]: 'Bon de livraison',
      [QuoteStatus.INVOICED]: 'Facturée',
    };
    return labels[status] || status;
  }
}
