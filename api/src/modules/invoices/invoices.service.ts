import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as XLSX from 'xlsx';
import { Invoice, InvoiceItem, InvoiceStatus } from './entities/invoice.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';
import { SequenceConfig } from '../../common/types/sequence-config.interface';
import { PDFService } from '../pdf/pdf.service';
import { PdfQueueService } from '../pdf/pdf.queue.service';
import { StockService } from '../inventory/stock.service';
import { MovementType } from '../inventory/entities/stock-movement.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import {
  buildSequencePattern,
  generateSequenceNumber,
  generateSequenceId,
} from '../../common/helpers/sequence.helpers';
import {
  MinPriceCheckItem,
  findMinPriceViolation,
  getInvoiceStatusLabel,
  buildInvoiceExportRows,
  INVOICE_XLSX_COL_WIDTHS,
} from './invoices.helpers';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly pdfQueueService: PdfQueueService,
    private readonly stockService: StockService,
  ) {}

  private get invoiceRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get invoiceItemRepository(): Repository<InvoiceItem> {
    return this.tenantConnService.getRepository(InvoiceItem);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  // ─── DB helpers ───────────────────────────────────────────────────────────

  private async calculateInvoiceStatus(
    invoiceId: number,
  ): Promise<InvoiceStatus> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items'],
    });
    if (!invoice) return InvoiceStatus.DRAFT;
    if (!invoice.isValidated) return InvoiceStatus.DRAFT;

    const totalPaid = parseFloat(invoice.paidAmount?.toString() || '0');
    const total = parseFloat(invoice.total.toString());
    if (totalPaid === 0) return InvoiceStatus.UNPAID;
    if (totalPaid >= total) return InvoiceStatus.PAID;
    return InvoiceStatus.PARTIAL;
  }

  private async getTotalPaid(invoiceId: number): Promise<number> {
    const result: { total: string }[] =
      await this.invoiceRepository.manager.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE "invoiceId" = $1`,
        [invoiceId],
      );
    return parseFloat(result[0]?.total || '0');
  }

  private async invalidateInvoiceCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`invoice:${id}`);
  }

  // ─── Provisional number ───────────────────────────────────────────────────

  private async getNextProvNumber(excludeId?: number): Promise<string> {
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.documentNumber')
      .where('invoice.documentNumber LIKE :pattern', { pattern: 'PROV%' });
    if (excludeId) qb.andWhere('invoice.id != :excludeId', { excludeId });
    const provInvoices = await qb.getMany();
    let max = 0;
    for (const inv of provInvoices) {
      const match = inv.documentNumber.match(/PROV(\d+)/);
      if (match) {
        const n = parseInt(match[1]);
        if (n > max) max = n;
      }
    }
    return `PROV${max + 1}`;
  }

  // ─── Min-price validation ─────────────────────────────────────────────────

  private async validateMinPrices(
    items: MinPriceCheckItem[],
    isVente: boolean,
  ): Promise<void> {
    if (!isVente) return;
    const productIds = items
      .filter((i) => i.productId != null)
      .map((i) => i.productId as number);
    if (!productIds.length) return;

    const products = await this.productRepository.find({
      where: { id: In(productIds) },
    });
    const productMap = new Map(
      products.map((p) => [
        p.id,
        { name: p.name, minPrice: Number(p.minPrice) },
      ]),
    );
    const error = findMinPriceViolation(items, productMap);
    if (error) throw new BadRequestException(error);
  }

  // ─── Sequence helpers ─────────────────────────────────────────────────────

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
        const prefix = entityType === 'invoice_purchase' ? 'FB' : 'FA';
        const now = new Date();
        const defaultSequence: SequenceConfig = {
          id: generateSequenceId(),
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

      await this.syncSequenceWithDatabase(sequence, documentDate);
      return sequence;
    } catch {
      const prefix = entityType === 'invoice_purchase' ? 'FB' : 'FA';
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

  private async syncSequenceWithDatabase(
    sequence: SequenceConfig,
    documentDate?: string | Date,
  ): Promise<void> {
    try {
      const pattern = buildSequencePattern(sequence, documentDate);
      const invoices = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .where('invoice.documentNumber LIKE :pattern', {
          pattern: `${pattern}%`,
        })
        .andWhere('invoice.documentNumber NOT LIKE :provisional', {
          provisional: 'PROV%',
        })
        .getMany();

      if (invoices.length === 0) {
        sequence.nextNumber = 1;
        return;
      }

      const numbers = invoices
        .map((inv) => {
          const numberPart = inv.documentNumber.replace(pattern, '');
          return parseInt(numberPart.replace(sequence.suffix || '', ''), 10);
        })
        .filter((n) => !isNaN(n));

      sequence.nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
    } catch (error) {
      this.logger.error(
        'Failed to sync sequence with database',
        (error as Error)?.stack,
      );
    }
  }

  private async updateSequenceNextNumber(
    entityType: string,
    sequence: SequenceConfig,
  ): Promise<void> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
      const idx = sequences.findIndex((seq) => seq.id === sequence.id);
      if (idx !== -1) {
        sequences[idx].nextNumber = sequence.nextNumber + 1;
        sequences[idx].updatedAt = new Date().toISOString();
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

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(
    search?: string,
    status?: string,
    customerId?: number,
    supplierId?: number,
    dateFrom?: string,
    dateTo?: string,
    page?: number,
    pageSize?: number,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{ invoices: Invoice[]; count: number; totalCount: number }> {
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('invoice.items', 'items');

    if (search) {
      qb.andWhere(
        '(invoice.documentNumber ILIKE :search OR customer.name ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('invoice.status = :status', { status });
    if (customerId)
      qb.andWhere('invoice.customerId = :customerId', { customerId });
    if (supplierId)
      qb.andWhere('invoice.supplierId = :supplierId', { supplierId });
    if (direction) qb.andWhere('invoice.direction = :direction', { direction });
    if (dateFrom) qb.andWhere('invoice.date >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('invoice.date <= :dateTo', { dateTo });
    qb.orderBy('invoice.dateCreated', 'DESC');

    if (page && pageSize) {
      qb.skip((page - 1) * pageSize).take(pageSize);
    } else if (pageSize) {
      qb.take(pageSize);
    } else {
      qb.take(100);
    }

    const [invoices, totalCount] = await qb.getManyAndCount();
    return { invoices, count: invoices.length, totalCount };
  }

  async findOne(id: number): Promise<Invoice | null> {
    const cacheKey = `invoice:${id}`;
    const cached = await this.cacheManager.get<Invoice>(cacheKey);
    if (cached) return cached;

    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items'],
    });
    if (invoice) await this.cacheManager.set(cacheKey, invoice, 300_000);
    return invoice;
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const lastProv = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('invoice.id', 'DESC')
      .limit(1)
      .getOne();

    let nextNum = 1;
    if (lastProv) {
      const match = lastProv.invoiceNumber.match(/PROV(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    return this.createInvoiceWithNumber(createInvoiceDto, `PROV${nextNum}`);
  }

  private async createInvoiceWithNumber(
    dto: CreateInvoiceDto,
    invoiceNumber: string,
  ): Promise<Invoice> {
    const isVente = !dto.supplierId;
    await this.validateMinPrices(dto.items ?? [], isVente);

    const invoice = this.invoiceRepository.create({
      documentNumber: invoiceNumber,
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
      date: dto.date ? new Date(dto.date) : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      subtotal: dto.subtotal,
      tax: dto.tax,
      discount: dto.discount,
      discountType: dto.discountType,
      total: dto.total,
      remainingAmount: dto.total || 0,
      notes: dto.notes,
      status: InvoiceStatus.DRAFT,
      isValidated: false,
    });

    const saved = await this.invoiceRepository.save(invoice);

    const invoiceItems = (dto.items ?? []).map((item) =>
      this.invoiceItemRepository.create({
        invoiceId: saved.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax || 0,
        total: item.total || 0,
      }),
    );
    await this.invoiceItemRepository.save(invoiceItems);

    const result = await this.findOne(saved.id);
    if (!result) throw new Error('Failed to create invoice');
    return result;
  }

  async update(
    id: number,
    updateDto: Partial<CreateInvoiceDto>,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.isValidated) {
      throw new BadRequestException(
        'Cannot update a validated invoice. Please devalidate it first.',
      );
    }

    const finalSupplierId =
      updateDto.supplierId !== undefined
        ? updateDto.supplierId
        : invoice.supplierId;
    const direction = finalSupplierId
      ? DocumentDirection.ACHAT
      : DocumentDirection.VENTE;

    try {
      if (updateDto.items && Array.isArray(updateDto.items)) {
        if (updateDto.items.length === 0) {
          throw new BadRequestException(
            'Cannot update invoice with empty items array',
          );
        }

        const isVente = !invoice.supplierId;
        await this.validateMinPrices(updateDto.items, isVente);

        const existingItems = await this.invoiceItemRepository.find({
          where: { invoiceId: id },
        });
        const existingIds = new Set(existingItems.map((i) => i.id));
        const newIds = new Set(
          updateDto.items
            .filter((i) => i.id && typeof i.id === 'number')
            .map((i) => i.id),
        );

        const itemsToSave = updateDto.items.map((item) =>
          this.invoiceItemRepository.create({
            ...(item.id && existingIds.has(item.id) ? { id: item.id } : {}),
            invoiceId: id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            tax: item.tax || 0,
            total: item.total || 0,
          }),
        );
        await this.invoiceItemRepository.save(itemsToSave);

        const toDelete = existingItems.filter((e) => !newIds.has(e.id));
        if (toDelete.length) await this.invoiceItemRepository.remove(toDelete);

        const { items: _items, ...invoiceUpdateData } = updateDto;
        await this.invoiceRepository.update(id, {
          ...invoiceUpdateData,
          direction,
          date: updateDto.date ? new Date(updateDto.date) : invoice.date,
          dueDate: updateDto.dueDate
            ? new Date(updateDto.dueDate)
            : invoice.dueDate,
        });
      } else {
        await this.invoiceRepository.update(id, {
          ...updateDto,
          direction,
          date: updateDto.date ? new Date(updateDto.date) : undefined,
          dueDate: updateDto.dueDate ? new Date(updateDto.dueDate) : undefined,
        });
      }

      await this.invalidateInvoiceCache(id);
      const result = await this.findOne(id);
      if (!result)
        throw new NotFoundException('Invoice not found after update');
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating invoice ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const totalPaid = await this.getTotalPaid(id);
    if (totalPaid > 0)
      throw new Error('Cannot delete invoice that has payments.');

    const invoice = await this.findOne(id);
    await this.invoiceItemRepository.delete({ invoiceId: id });
    await this.pdfService.deletePDF(invoice?.pdfUrl);
    await this.invoiceRepository.delete(id);
    await this.invalidateInvoiceCache(id);
  }

  // ─── Validate / Devalidate ────────────────────────────────────────────────

  async validate(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.isValidated)
      throw new BadRequestException('Invoice is already validated');

    let finalNumber = invoice.documentNumber;

    if (invoice.documentNumber.startsWith('PROV')) {
      const sequenceType = invoice.supplierId
        ? 'invoice_purchase'
        : 'invoice_sale';
      const sequence = await this.getOrCreateSequence(
        sequenceType,
        invoice.date,
      );
      finalNumber = generateSequenceNumber(sequence, invoice.date);
      await this.updateSequenceNextNumber(sequenceType, sequence);
    }

    await this.invoiceRepository.update(id, {
      documentNumber: finalNumber,
      isValidated: true,
      validationDate: new Date(),
      status: InvoiceStatus.UNPAID,
      remainingAmount: invoice.total,
    });

    // Auto-create stock movements
    try {
      const inventoryConfig =
        await this.configurationsService.findByEntity('inventory');
      const invValues = inventoryConfig?.values as Record<
        string,
        unknown
      > | null;
      const defaultWarehouseId = invValues?.defaultWarehouseId as number | null;

      if (defaultWarehouseId) {
        const shouldMove =
          (invoice.direction === DocumentDirection.ACHAT &&
            invValues?.incrementStockOnInvoiceAchat) ||
          (invoice.direction === DocumentDirection.VENTE &&
            invValues?.decrementStockOnInvoiceVente);

        if (shouldMove) {
          const withItems = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['items'],
          });

          if (withItems?.items?.length) {
            const isAchat = invoice.direction === DocumentDirection.ACHAT;
            const movementType = isAchat
              ? MovementType.RECEIPT
              : MovementType.DELIVERY;
            const partnerName = isAchat
              ? invoice.supplierName
              : invoice.customerName;

            for (const item of withItems.items) {
              if (!item.productId || item.quantity <= 0) continue;
              try {
                const movement = await this.stockService.createMovement({
                  movementType,
                  productId: item.productId,
                  quantity: item.quantity,
                  ...(isAchat
                    ? { destWarehouseId: defaultWarehouseId }
                    : { sourceWarehouseId: defaultWarehouseId }),
                  origin: finalNumber,
                  partnerName: partnerName ?? undefined,
                });
                await this.stockService.validateMovement({
                  movementId: movement.id,
                });
              } catch (itemError) {
                this.logger.warn(
                  `Failed to create stock movement for invoice ${id}, product ${item.productId}: ${(itemError as Error)?.message}`,
                );
              }
            }
          }
        }
      }
    } catch (stockError) {
      this.logger.warn(
        `Failed to process stock movements for invoice ${id}: ${(stockError as Error)?.message}`,
      );
    }

    void this.pdfQueueService.enqueue('invoice', id);
    await this.invalidateInvoiceCache(id);
    const result = await this.findOne(id);
    if (!result)
      throw new NotFoundException('Invoice not found after validation');
    return result;
  }

  async devalidate(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.isValidated)
      throw new BadRequestException('Invoice is not validated');

    try {
      const sequenceType = invoice.supplierId
        ? 'invoice_purchase'
        : 'invoice_sale';
      const sequence = await this.getOrCreateSequence(
        sequenceType,
        invoice.date,
      );
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
      const idx = sequences.findIndex((seq) => seq.id === sequence.id);

      if (idx !== -1) {
        const pattern = buildSequencePattern(sequence, invoice.date);
        const lastInvoice = await this.invoiceRepository
          .createQueryBuilder('invoice')
          .where('invoice.documentNumber LIKE :pattern', {
            pattern: `${pattern}%`,
          })
          .andWhere('invoice.isValidated = :validated', { validated: true })
          .orderBy(
            "CAST(SUBSTRING(invoice.documentNumber FROM '[0-9]+$') AS INTEGER)",
            'DESC',
          )
          .limit(1)
          .getOne();

        let nextNumber = 1;
        if (lastInvoice) {
          const match = lastInvoice.documentNumber.match(/(\d+)$/);
          if (match) nextNumber = parseInt(match[1]);
        }

        sequences[idx].nextNumber = nextNumber;
        sequences[idx].updatedAt = new Date().toISOString();
        await this.configurationsService.update(config.id, {
          values: { sequences },
        });
      }
    } catch (error) {
      this.logger.error(
        'Error updating sequence during devalidation',
        (error as Error)?.stack,
      );
    }

    const nextProvNumber = invoice.documentNumber.startsWith('PROV')
      ? invoice.documentNumber
      : await this.getNextProvNumber(id);

    await this.pdfService.deletePDF(invoice.pdfUrl);
    await this.invoiceRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: InvoiceStatus.DRAFT,
      pdfUrl: null,
    });

    await this.invalidateInvoiceCache(id);
    const result = await this.findOne(id);
    if (!result)
      throw new NotFoundException('Invoice not found after devalidation');
    return result;
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    const isVente = direction === 'vente';
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year });
    if (isVente) {
      qb.andWhere('invoice.customerId IS NOT NULL');
    } else {
      qb.andWhere('invoice.supplierId IS NOT NULL');
    }
    const invoices = await qb.getMany();

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthly = invoices.filter(
        (inv) => new Date(inv.date).getMonth() === i,
      );
      return {
        month: i + 1,
        count: monthly.length,
        amount: monthly.reduce((sum, inv) => sum + Number(inv.total), 0),
      };
    });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const draftCount = invoices.filter(
      (inv) => inv.status === InvoiceStatus.DRAFT,
    ).length;
    const unpaidCount = invoices.filter(
      (inv) => inv.status === InvoiceStatus.UNPAID,
    ).length;
    const paidCount = invoices.filter(
      (inv) => inv.status === InvoiceStatus.PAID,
    ).length;
    const unpaidAmount = invoices
      .filter(
        (inv) =>
          inv.status === InvoiceStatus.UNPAID ||
          inv.status === InvoiceStatus.PARTIAL,
      )
      .reduce((sum, inv) => sum + Number(inv.remainingAmount || inv.total), 0);

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalInvoices,
        totalAmount,
        draftCount,
        unpaidCount,
        paidCount,
        unpaidAmount,
      },
    };
  }

  // ─── XLSX Export ──────────────────────────────────────────────────────────

  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .orderBy('invoice.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        qb.where('invoice.supplierId = :supplierId', { supplierId });
      } else {
        qb.where('invoice.supplierId IS NULL');
      }
    }

    const invoices = await qb.getMany();
    const exportData = invoices.flatMap((inv) => buildInvoiceExportRows(inv));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = INVOICE_XLSX_COL_WIDTHS;

    const sheetName =
      supplierId !== undefined
        ? supplierId
          ? 'Factures achat'
          : 'Factures vente'
        : 'Factures';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── Share link ───────────────────────────────────────────────────────────

  async generateShareLink(
    id: number,
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!invoice.isValidated || invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only validated invoices can be shared');
    }

    const shareToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.invoiceRepository.update(id, {
      shareToken,
      shareTokenExpiry: expiresAt,
    });
    await this.invalidateInvoiceCache(id);
    return { shareToken, expiresAt };
  }

  async getByShareToken(token: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .where('invoice.shareToken = :token', { token })
      .getOne();

    if (!invoice)
      throw new NotFoundException('Invoice not found or link has expired');

    if (
      invoice.shareTokenExpiry &&
      new Date() > new Date(invoice.shareTokenExpiry)
    ) {
      throw new BadRequestException('This invoice link has expired');
    }

    return invoice;
  }

  async revokeShareLink(id: number): Promise<void> {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.invoiceRepository.update(id, {
      shareToken: null,
      shareTokenExpiry: null,
    });
    await this.invalidateInvoiceCache(id);
  }

  // ─── Recalculate status ───────────────────────────────────────────────────

  async recalculateStatus(id: number): Promise<Invoice> {
    const newStatus = await this.calculateInvoiceStatus(id);
    await this.invoiceRepository.update(id, { status: newStatus });
    await this.invalidateInvoiceCache(id);
    const result = await this.findOne(id);
    if (!result) throw new NotFoundException('Invoice not found');
    return result;
  }
}
