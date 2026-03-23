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
import { Invoice, InvoiceItem, InvoiceStatus } from './entities/invoice.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsService } from '../configurations/configurations.service';
import { SequenceConfig } from '../../common/types/sequence-config.interface';
import { PDFService } from '../pdf/pdf.service';
import { StockService } from '../inventory/stock.service';
import { MovementType } from '../inventory/entities/stock-movement.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateInvoiceDto, InvoiceItemDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly stockService: StockService,
  ) { }

  private get invoiceRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get invoiceItemRepository(): Repository<InvoiceItem> {
    return this.tenantConnService.getRepository(InvoiceItem);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

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
    const result: { total: string }[] =
      await this.invoiceRepository.manager.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE "invoiceId" = $1`,
        [invoiceId],
      );
    return parseFloat(result[0]?.total || '0');
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
        let prefix = 'FA'; // Default for invoice_sale
        if (entityType === 'invoice_purchase') {
          prefix = 'FB';
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
      let prefix = 'FA'; // Default for invoice_sale
      if (entityType === 'invoice_purchase') {
        prefix = 'FB';
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
      // Build the current pattern for this sequence using document date (e.g., "FA 2026-02-")
      const pattern = this.buildSequencePattern(sequence, documentDate);

      // Find all invoices with document numbers matching this pattern
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
        // No invoices found for this pattern, reset to 1
        sequence.nextNumber = 1;
        return;
      }

      // Extract all sequence numbers from the invoices
      const numbers = invoices
        .map((invoice) => {
          // Remove the pattern prefix to get just the number part
          const numberPart = invoice.documentNumber.replace(pattern, '');
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

  private generateSequenceNumber(
    sequence: SequenceConfig,
    documentDate?: string | Date,
  ): string {
    // Use document date if provided, otherwise fallback to current date
    const now = documentDate ? new Date(documentDate) : new Date();
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
      // Continue execution even if sequence update fails
    }
  }

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
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('invoice.items', 'items');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR customer.name ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('invoice.customerId = :customerId', { customerId });
    }

    if (supplierId) {
      queryBuilder.andWhere('invoice.supplierId = :supplierId', { supplierId });
    }

    if (direction) {
      queryBuilder.andWhere('invoice.direction = :direction', { direction });
    }

    if (dateFrom) {
      queryBuilder.andWhere('invoice.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('invoice.date <= :dateTo', { dateTo });
    }

    queryBuilder.orderBy('invoice.dateCreated', 'DESC');

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

    const invoices = await queryBuilder.getMany();

    return {
      invoices,
      count: invoices.length,
      totalCount,
    };
  }

  private async invalidateInvoiceCache(id?: number) {
    if (id) await this.cacheManager.del(`invoice:${id}`);
  }

  async findOne(id: number): Promise<Invoice | null> {
    const cacheKey = `invoice:${id}`;
    const cached = await this.cacheManager.get<Invoice>(cacheKey);
    if (cached) return cached;

    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items'],
    });
    if (invoice) {
      await this.cacheManager.set(cacheKey, invoice, 300_000);
    }
    return invoice;
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
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
    createInvoiceDto: CreateInvoiceDto,
    invoiceNumber: string,
  ): Promise<Invoice> {
    // Use values from frontend directly (no recalculation)
    const items = (createInvoiceDto.items ?? []).map((item) => {
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
      direction: createInvoiceDto.supplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE,
      customerId: createInvoiceDto.customerId,
      customerName: createInvoiceDto.customerName,
      customerPhone: createInvoiceDto.customerPhone,
      customerAddress: createInvoiceDto.customerAddress,
      supplierId: createInvoiceDto.supplierId,
      supplierName: createInvoiceDto.supplierName,
      supplierPhone: createInvoiceDto.supplierPhone,
      supplierAddress: createInvoiceDto.supplierAddress,
      date: createInvoiceDto.date
        ? new Date(createInvoiceDto.date)
        : new Date(),
      dueDate: createInvoiceDto.dueDate
        ? new Date(createInvoiceDto.dueDate)
        : undefined,
      subtotal: createInvoiceDto.subtotal,
      tax: createInvoiceDto.tax,
      discount: createInvoiceDto.discount,
      discountType: createInvoiceDto.discountType,
      total: createInvoiceDto.total,
      remainingAmount: createInvoiceDto.total || 0,
      notes: createInvoiceDto.notes,
      status: InvoiceStatus.DRAFT,
      isValidated: false,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Validate minimum prices for items with productId (only for vente documents)
    const isVente = !createInvoiceDto.supplierId;
    if (isVente) {
      for (const item of createInvoiceDto.items ?? []) {
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
    updateInvoiceDto: Partial<CreateInvoiceDto>,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const finalSupplierId =
      updateInvoiceDto.supplierId !== undefined
        ? updateInvoiceDto.supplierId
        : invoice.supplierId;
    const direction = finalSupplierId
      ? DocumentDirection.ACHAT
      : DocumentDirection.VENTE;

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

        // Validate minimum prices for items with productId (only for vente documents)
        const isVente = !invoice.supplierId;
        if (isVente) {
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
        }

        // Get existing items
        const existingItems = await this.invoiceItemRepository.find({
          where: { invoiceId: id },
        });

        const existingItemIds = new Set(existingItems.map((item) => item.id));
        const newItemIds = new Set(
          items
            .filter((item) => item.id && typeof item.id === 'number')
            .map((item) => item.id),
        );

        // Update or create items
        const itemsToSave = items.map((item) => {
          if (item.id && existingItemIds.has(item.id)) {
            // Update existing item
            return this.invoiceItemRepository.create({
              id: item.id,
              invoiceId: id,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              tax: item.tax,
              total: item.total,
            });
          } else {
            // Create new item
            return this.invoiceItemRepository.create({
              invoiceId: id,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              tax: item.tax,
              total: item.total,
            });
          }
        });

        // Save all items (update existing, insert new)
        await this.invoiceItemRepository.save(itemsToSave);

        // Delete items that are no longer in the new items list
        const itemsToDelete = existingItems.filter(
          (existing) => !newItemIds.has(existing.id),
        );
        if (itemsToDelete.length > 0) {
          await this.invoiceItemRepository.remove(itemsToDelete);
          this.logger.debug(
            `Deleted ${itemsToDelete.length} removed items for invoice ${id}`,
          );
        }

        this.logger.debug(
          `Updated/created ${itemsToSave.length} items for invoice ${id}`,
        );

        // Prepare invoice update data (exclude items)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { items: _items, ...invoiceUpdateData } = updateInvoiceDto;

        // Update invoice with values from frontend
        await this.invoiceRepository.update(id, {
          ...invoiceUpdateData,
          direction,
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
          direction,
          date: updateInvoiceDto.date
            ? new Date(updateInvoiceDto.date)
            : undefined,
          dueDate: updateInvoiceDto.dueDate
            ? new Date(updateInvoiceDto.dueDate)
            : undefined,
        });
      }

      // Return the updated invoice
      await this.invalidateInvoiceCache(id);
      const result = await this.findOne(id);
      if (!result) {
        throw new NotFoundException('Invoice not found after update');
      }
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
    // Check if invoice has payments
    const totalPaid = await this.getTotalPaid(id);
    if (totalPaid > 0) {
      throw new Error('Cannot delete invoice that has payments.');
    }

    const invoice = await this.findOne(id);
    await this.invoiceItemRepository.delete({ invoiceId: id });
    await this.pdfService.deletePDF(invoice?.pdfUrl);
    await this.invoiceRepository.delete(id);
    await this.invalidateInvoiceCache(id);
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
      // Determine sequence type based on invoice direction
      const sequenceType = invoice.supplierId
        ? 'invoice_purchase'
        : 'invoice_sale';

      // Get sequence for appropriate invoice type
      const sequence = await this.getOrCreateSequence(
        sequenceType,
        invoice.date,
      );

      // Use the sequence's next document number directly with invoice date
      finalInvoiceNumber = this.generateSequenceNumber(sequence, invoice.date);

      // Increment sequence next number
      await this.updateSequenceNextNumber(sequenceType, sequence);
    }

    // Update invoice with final number (or keep existing) and validated status
    await this.invoiceRepository.update(id, {
      documentNumber: finalInvoiceNumber,
      isValidated: true,
      validationDate: new Date(),
      status: InvoiceStatus.UNPAID,
      remainingAmount: invoice.total,
    });

    // Auto-create stock movements based on inventory configuration
    try {
      const inventoryConfig =
        await this.configurationsService.findByEntity('inventory');
      const inventoryValues = inventoryConfig?.values as Record<
        string,
        unknown
      > | null;
      const defaultWarehouseId = inventoryValues?.defaultWarehouseId as
        | number
        | null;

      if (defaultWarehouseId) {
        const shouldCreateMovement =
          (invoice.direction === DocumentDirection.ACHAT &&
            inventoryValues?.incrementStockOnInvoiceAchat) ||
          (invoice.direction === DocumentDirection.VENTE &&
            inventoryValues?.decrementStockOnInvoiceVente);

        if (shouldCreateMovement) {
          const invoiceWithItems = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['items'],
          });

          if (invoiceWithItems?.items?.length) {
            const isAchat = invoice.direction === DocumentDirection.ACHAT;
            const movementType = isAchat
              ? MovementType.RECEIPT
              : MovementType.DELIVERY;
            const partnerName = isAchat
              ? invoice.supplierName
              : invoice.customerName;

            for (const item of invoiceWithItems.items) {
              if (!item.productId || item.quantity <= 0) continue;
              try {
                const movement = await this.stockService.createMovement({
                  movementType,
                  productId: item.productId,
                  quantity: item.quantity,
                  ...(isAchat
                    ? { destWarehouseId: defaultWarehouseId }
                    : { sourceWarehouseId: defaultWarehouseId }),
                  origin: finalInvoiceNumber,
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

    // Generate PDF and store in MinIO (non-blocking — failure doesn't abort validation)
    const documentType = (
      await this.invoiceRepository.findOne({
        where: { id },
        select: ['supplierId'],
      })
    )?.supplierId
      ? 'invoice' // facture achat
      : 'invoice'; // facture vente
    const pdfUrl = await this.pdfService.generateAndUploadPDF(documentType, id);
    if (pdfUrl) {
      await this.invoiceRepository.update(id, { pdfUrl });
    }

    await this.invalidateInvoiceCache(id);
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
      // Determine sequence type based on invoice direction
      const sequenceType = invoice.supplierId
        ? 'invoice_purchase'
        : 'invoice_sale';

      const sequence = await this.getOrCreateSequence(
        sequenceType,
        invoice.date,
      );
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
      const sequenceIndex = sequences.findIndex(
        (seq) => seq.id === sequence.id,
      );

      if (sequenceIndex !== -1) {
        // Find the highest document number in database with this sequence pattern
        const pattern = this.buildSequencePattern(sequence, invoice.date);
        const lastInvoice = await this.invoiceRepository
          .createQueryBuilder('invoice')
          .where('invoice.documentNumber LIKE :pattern', {
            pattern: pattern + '%',
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
    await this.pdfService.deletePDF(invoice.pdfUrl);
    await this.invoiceRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: InvoiceStatus.DRAFT,
      pdfUrl: null,
    });

    const result = await this.findOne(id);
    if (!result) {
      throw new NotFoundException('Invoice not found after devalidation');
    }
    await this.invalidateInvoiceCache(id);
    return result;
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    const isVente = direction === 'vente';

    // Get all invoices for the specified year and direction
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year });

    if (isVente) {
      queryBuilder.andWhere('invoice.customerId IS NOT NULL');
    } else {
      queryBuilder.andWhere('invoice.supplierId IS NOT NULL');
    }

    const invoices = await queryBuilder.getMany();

    // Calculate monthly chart data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.date).getMonth() === monthIndex,
      );

      return {
        month: monthIndex + 1,
        count: monthInvoices.length,
        amount: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      };
    });

    // Calculate KPIs
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

  /**
   * Export invoices to XLSX format
   */
  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .orderBy('invoice.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        queryBuilder.where('invoice.supplierId = :supplierId', { supplierId });
      } else {
        queryBuilder.where('invoice.supplierId IS NULL');
      }
    }

    const invoices = await queryBuilder.getMany();

    // Flatten data for export - one row per item
    const exportData: any[] = [];

    invoices.forEach((invoice) => {
      const isFactureAchat = !!invoice.supplierId;
      const baseData = {
        Numéro: invoice.documentNumber,
        Date: invoice.date
          ? new Date(invoice.date).toLocaleDateString('fr-FR')
          : '',
        'Date échéance': invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString('fr-FR')
          : '',
        Type: isFactureAchat ? 'Facture achat' : 'Facture vente',
        'Client/Fournisseur': isFactureAchat
          ? invoice.supplierName || invoice.supplier?.name || ''
          : invoice.customerName || invoice.customer?.name || '',
        Téléphone: isFactureAchat
          ? invoice.supplierPhone || ''
          : invoice.customerPhone || '',
        Adresse: isFactureAchat
          ? invoice.supplierAddress || invoice.supplier?.address || ''
          : invoice.customerAddress || invoice.customer?.address || '',
        Statut: this.getInvoiceStatusLabel(invoice.status),
        'Sous-total': Number(invoice.subtotal),
        Remise: Number(invoice.discount),
        'Type remise': invoice.discountType === 0 ? 'Montant' : 'Pourcentage',
        Taxe: Number(invoice.tax),
        Total: Number(invoice.total),
        'Montant payé': Number(invoice.paidAmount),
        'Montant restant': Number(invoice.remainingAmount),
        Notes: invoice.notes || '',
      };

      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
          exportData.push({
            ...baseData,
            Ligne: index + 1,
            'Code produit': item.product?.code || '',
            'Produit/Service': item.description,
            Quantité: Number(item.quantity),
            'Prix unitaire': Number(item.unitPrice),
            'Remise ligne': Number(item.discount),
            'Type remise ligne':
              item.discountType === 0 ? 'Montant' : 'Pourcentage',
            'Taxe ligne (%)': Number(item.tax),
            'Total ligne': Number(item.total),
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
      { wch: 12 },
      { wch: 15 },
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
          ? 'Factures achat'
          : 'Factures vente'
        : 'Factures';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  private getInvoiceStatusLabel(status: InvoiceStatus): string {
    const labels = {
      [InvoiceStatus.DRAFT]: 'Brouillon',
      [InvoiceStatus.UNPAID]: 'Non payée',
      [InvoiceStatus.PARTIAL]: 'Partiellement payée',
      [InvoiceStatus.PAID]: 'Payée',
    };
    return labels[status] || status;
  }
}
