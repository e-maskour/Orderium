import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as XLSX from 'xlsx';
import { Quote, QuoteItem, QuoteStatus } from './entities/quote.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';
import { PDFService } from '../pdf/pdf.service';
import { PdfQueueService } from '../pdf/pdf.queue.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateQuoteDto } from './dto/quote.dto';
import { SequencesService } from '../sequences/sequences.service';
import {
  findMinPriceViolation,
  getQuoteStatusLabel,
  buildQuoteExportRows,
  QUOTE_XLSX_COL_WIDTHS,
} from './quotes.helpers';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    private readonly sequencesService: SequencesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly pdfQueueService: PdfQueueService,
  ) {}

  private get quoteRepository(): Repository<Quote> {
    return this.tenantConnService.getRepository(Quote);
  }

  private get quoteItemRepository(): Repository<QuoteItem> {
    return this.tenantConnService.getRepository(QuoteItem);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private async invalidateQuoteCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`quote:${id}`);
  }

  // ── Min-price validation (batch) ──────────────────────────────────────────

  private async validateMinPrices(
    items: CreateQuoteDto['items'],
    isVente: boolean,
  ): Promise<void> {
    if (!isVente || !items?.length) return;

    const productIds = items
      .filter((i) => i.productId != null && i.unitPrice != null)
      .map((i) => i.productId as number);

    if (!productIds.length) return;

    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      select: ['id', 'name', 'minPrice'],
    });
    const productMap = new Map(
      products
        .map((p) => ({ id: p.id, name: p.name, minPrice: Number(p.minPrice) }))
        .map((p) => [p.id, p]),
    );

    const violation = findMinPriceViolation(items, productMap);
    if (violation) throw new BadRequestException(violation);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

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
  ): Promise<{
    quotes: Quote[];
    count: number;
    totalCount: number;
  }> {
    const qb = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.supplier', 'supplier')
      .leftJoinAndSelect('quote.items', 'items');

    if (search) {
      qb.andWhere(
        '(quote.documentNumber ILIKE :search OR customer.name ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('quote.status = :status', { status });
    if (customerId)
      qb.andWhere('quote.customerId = :customerId', { customerId });
    if (supplierId)
      qb.andWhere('quote.supplierId = :supplierId', { supplierId });
    if (direction) qb.andWhere('quote.direction = :direction', { direction });
    if (dateFrom) qb.andWhere('quote.date >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('quote.date <= :dateTo', { dateTo });

    qb.orderBy('quote.dateCreated', 'DESC');

    if (page && pageSize) {
      qb.skip((page - 1) * pageSize).take(pageSize);
    } else if (pageSize) {
      qb.take(pageSize);
    } else {
      qb.take(100);
    }

    const [quotes, totalCount] = await qb.getManyAndCount();

    return {
      quotes,
      count: quotes.length,
      totalCount,
    };
  }

  async getAggregates(
    search?: string,
    status?: string,
    customerId?: number,
    dateFrom?: string,
    dateTo?: string,
    supplierId?: number,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  }> {
    const aggQb = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoin('quote.customer', 'customer')
      .leftJoin('quote.supplier', 'supplier')
      .select('COALESCE(SUM(quote.total), 0)', 'totalAmount');

    if (search) {
      aggQb.andWhere(
        '(quote.documentNumber ILIKE :search OR customer.name ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) aggQb.andWhere('quote.status = :status', { status });
    if (customerId)
      aggQb.andWhere('quote.customerId = :customerId', { customerId });
    if (supplierId)
      aggQb.andWhere('quote.supplierId = :supplierId', { supplierId });
    if (direction)
      aggQb.andWhere('quote.direction = :direction', { direction });
    if (dateFrom) aggQb.andWhere('quote.date >= :dateFrom', { dateFrom });
    if (dateTo) aggQb.andWhere('quote.date <= :dateTo', { dateTo });

    const aggResult = await aggQb.getRawOne<{ totalAmount: string }>();
    const totalAmount = parseFloat(aggResult?.totalAmount || '0');

    return {
      totalAmount,
      totalPaid: 0,
      totalRemaining: totalAmount,
    };
  }

  async findOne(id: number): Promise<Quote | null> {
    const cacheKey = `quote:${id}`;
    const cached = await this.cacheManager.get<Quote>(cacheKey);
    if (cached) return cached;

    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items'],
    });
    if (quote) await this.cacheManager.set(cacheKey, quote, 300_000);
    return quote;
  }

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const last = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('quote.id', 'DESC')
      .limit(1)
      .getOne();

    let next = 1;
    if (last) {
      const match = last.quoteNumber.match(/PROV(\d+)/);
      if (match) next = parseInt(match[1]) + 1;
    }

    return this.createQuoteWithNumber(createQuoteDto, `PROV${next}`);
  }

  private async createQuoteWithNumber(
    dto: CreateQuoteDto,
    quoteNumber: string,
  ): Promise<Quote> {
    const quote = this.quoteRepository.create({
      documentNumber: quoteNumber,
      direction: dto.supplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerAddress: dto.customerAddress,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      supplierPhone: dto.supplierPhone,
      supplierAddress: dto.supplierAddress,
      date: new Date(dto.date),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
      subtotal: dto.subtotal || 0,
      tax: dto.tax,
      discount: dto.discount,
      discountType: dto.discountType,
      total: dto.total || 0,
      notes: dto.notes,
      status: QuoteStatus.DRAFT,
      isValidated: false,
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Validate min prices in one batch query (not per-item)
    await this.validateMinPrices(dto.items, !dto.supplierId);

    const items = (dto.items ?? []).map((item) =>
      this.quoteItemRepository.create({
        quoteId: savedQuote.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax || 0,
        total: item.total ?? 0,
      }),
    );
    await this.quoteItemRepository.save(items);

    const result = await this.findOne(savedQuote.id);
    if (!result) throw new Error('Failed to create quote');
    return result;
  }

  async update(
    id: number,
    updateQuoteDto: Partial<CreateQuoteDto>,
  ): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');

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
      if (updateQuoteDto.items?.length) {
        if (updateQuoteDto.items.length === 0) {
          throw new BadRequestException(
            'Cannot update quote with empty items array',
          );
        }

        await this.quoteItemRepository.delete({ quoteId: id });

        // Batch min-price validation
        await this.validateMinPrices(updateQuoteDto.items, !quote.supplierId);

        const newItems = updateQuoteDto.items.map((item) =>
          this.quoteItemRepository.create({
            quoteId: id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? 0,
            discount: item.discount,
            discountType: item.discountType,
            tax: item.tax || 0,
            total: item.total ?? 0,
          }),
        );
        await this.quoteItemRepository.save(newItems);
      }

      const finalSupplierId =
        updateQuoteDto.supplierId !== undefined
          ? updateQuoteDto.supplierId
          : quote.supplierId;
      const direction = finalSupplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE;

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

      await this.invalidateQuoteCache(id);
      const result = await this.findOne(id);
      if (!result) throw new NotFoundException('Quote not found after update');
      return result;
    } catch (error) {
      this.logger.error(`Error updating quote ${id}`, (error as Error)?.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');

    if (quote.status === QuoteStatus.INVOICED) {
      throw new BadRequestException('QUOTE_CONVERTED_TO_INVOICE');
    }

    if (quote.isValidated) {
      throw new BadRequestException('QUOTE_VALIDATED');
    }

    await this.quoteItemRepository.delete({ quoteId: id });
    await this.pdfService.deletePDF(quote.pdfUrl);
    await this.quoteRepository.delete(id);
    await this.invalidateQuoteCache(id);
  }

  // ── Validate / Devalidate ──────────────────────────────────────────────────

  async validate(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.isValidated)
      throw new BadRequestException('Quote is already validated');

    let finalNumber = quote.documentNumber;

    if (quote.documentNumber.startsWith('PROV')) {
      const seqType = quote.supplierId ? 'price_request' : 'quote';
      finalNumber = await this.sequencesService.generateNext(seqType, {
        date: quote.date ? new Date(quote.date) : new Date(),
      });
    }

    await this.quoteRepository.update(id, {
      documentNumber: finalNumber,
      isValidated: true,
      validationDate: new Date(),
      status: QuoteStatus.OPEN,
    });

    void this.pdfQueueService.enqueue('quote', id);
    await this.invalidateQuoteCache(id);

    const result = await this.findOne(id);
    if (!result) throw new Error('Quote not found after validation');
    return result;
  }

  async devalidate(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (!quote.isValidated)
      throw new BadRequestException('Quote is not validated');
    if (quote.status === QuoteStatus.INVOICED) {
      throw new BadRequestException(
        'Cannot devalidate a quote that has been converted to an invoice',
      );
    }

    // Roll back the sequence counter if this was the last issued number in the period.
    if (!quote.documentNumber.startsWith('PROV')) {
      const seqTypeForRelease = quote.supplierId ? 'price_request' : 'quote';
      await this.sequencesService.releaseNumber(
        seqTypeForRelease,
        quote.documentNumber,
      );
    }

    let nextProvNumber: string;
    if (quote.documentNumber.startsWith('PROV')) {
      nextProvNumber = quote.documentNumber;
    } else {
      const allProv = await this.quoteRepository
        .createQueryBuilder('quote')
        .select('quote.documentNumber')
        .where('quote.documentNumber LIKE :pattern', { pattern: 'PROV%' })
        .andWhere('quote.id != :currentId', { currentId: id })
        .getMany();

      let max = 0;
      for (const p of allProv) {
        const m = p.documentNumber.match(/PROV(\d+)/);
        if (m && parseInt(m[1]) > max) max = parseInt(m[1]);
      }
      nextProvNumber = `PROV${max + 1}`;
    }

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
    if (!result) throw new Error('Quote not found after devalidation');
    return result;
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async accept(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.OPEN) {
      throw new BadRequestException('Only open quotes can be accepted');
    }
    await this.quoteRepository.update(id, { status: QuoteStatus.SIGNED });
    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) throw new Error('Quote not found after acceptance');
    return result;
  }

  async reject(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.OPEN) {
      throw new BadRequestException('Only open quotes can be rejected');
    }
    await this.quoteRepository.update(id, { status: QuoteStatus.CLOSED });
    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) throw new Error('Quote not found after rejection');
    return result;
  }

  // ── Share link ─────────────────────────────────────────────────────────────

  async generateShareLink(
    id: number,
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (!quote.isValidated || quote.status === QuoteStatus.DRAFT) {
      throw new BadRequestException('Only validated quotes can be shared');
    }

    const shareToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);

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

    if (!quote)
      throw new NotFoundException('Quote not found or link has expired');
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
    if (!result) throw new Error('Quote not found after signing');
    return result;
  }

  async unsignQuote(id: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
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
    if (!result) throw new Error('Quote not found after refusing');
    return result;
  }

  // ── Conversions ────────────────────────────────────────────────────────────

  async convertToOrder(id: number, orderId: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SIGNED) {
      throw new BadRequestException('Only signed quotes can be converted');
    }

    const newStatus = quote.convertedToInvoiceId
      ? QuoteStatus.INVOICED
      : QuoteStatus.DELIVERED;

    await this.quoteRepository.update(id, {
      convertedToOrderId: orderId,
      status: newStatus,
    });

    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) throw new Error('Quote not found after conversion');
    return result;
  }

  async convertToInvoice(id: number, invoiceId: number): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SIGNED) {
      throw new BadRequestException('Only signed quotes can be converted');
    }
    await this.quoteRepository.update(id, {
      convertedToInvoiceId: invoiceId,
      status: QuoteStatus.INVOICED,
    });
    await this.invalidateQuoteCache(id);
    const result = await this.findOne(id);
    if (!result) throw new Error('Quote not found after conversion');
    return result;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    const qb = this.quoteRepository
      .createQueryBuilder('quote')
      .andWhere('EXTRACT(YEAR FROM quote.date) = :year', { year });

    if (direction === 'vente') {
      qb.andWhere('quote.customerId IS NOT NULL');
    } else {
      qb.andWhere('quote.supplierId IS NOT NULL');
    }

    const quotes = await qb.getMany();

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthQuotes = quotes.filter(
        (q) => new Date(q.date).getMonth() === i,
      );
      return {
        month: i + 1,
        count: monthQuotes.length,
        amount: monthQuotes.reduce((s, q) => s + Number(q.total), 0),
      };
    });

    const total = quotes.length;
    const totalAmount = quotes.reduce((s, q) => s + Number(q.total), 0);
    const accepted = [
      QuoteStatus.SIGNED,
      QuoteStatus.INVOICED,
      QuoteStatus.DELIVERED,
    ];
    const acceptedCount = quotes.filter((q) =>
      accepted.includes(q.status),
    ).length;
    const acceptedValue = quotes
      .filter((q) => accepted.includes(q.status))
      .reduce((s, q) => s + Number(q.total), 0);
    const pendingCount = quotes.filter(
      (q) => q.status === QuoteStatus.OPEN || q.status === QuoteStatus.DRAFT,
    ).length;

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalQuotes: total,
        totalAmount,
        acceptedCount,
        pendingCount,
        acceptedValue,
        conversionRate: total > 0 ? (acceptedCount / total) * 100 : 0,
      },
    };
  }

  // ── XLSX export ────────────────────────────────────────────────────────────

  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const qb = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.supplier', 'supplier')
      .orderBy('quote.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        qb.where('quote.supplierId = :supplierId', { supplierId });
      } else {
        qb.where('quote.supplierId IS NULL');
      }
    }

    const quotes = await qb.getMany();
    const exportData = quotes.flatMap(buildQuoteExportRows);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = QUOTE_XLSX_COL_WIDTHS;

    const sheetName =
      supplierId !== undefined
        ? supplierId
          ? 'Demandes de prix'
          : 'Devis'
        : 'Devis et Demandes';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
