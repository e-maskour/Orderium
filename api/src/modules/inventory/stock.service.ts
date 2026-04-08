import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { StockQuant } from './entities/stock-quant.entity';
import {
  StockMovement,
  MovementType,
  MovementStatus,
  SourceDocumentType,
} from './entities/stock-movement.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  ValidateMovementDto,
  InternalTransferDto,
} from './dto/stock-movement.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { calcAvailableQty } from './stock.helpers';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly tenantConnService: TenantConnectionService) {}

  private get stockQuantRepository(): Repository<StockQuant> {
    return this.tenantConnService.getRepository(StockQuant);
  }

  private get stockMovementRepository(): Repository<StockMovement> {
    return this.tenantConnService.getRepository(StockMovement);
  }

  private get warehouseRepository(): Repository<Warehouse> {
    return this.tenantConnService.getRepository(Warehouse);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private get uomRepository(): Repository<UnitOfMeasure> {
    return this.tenantConnService.getRepository(UnitOfMeasure);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  // ==================== STOCK QUANT OPERATIONS ====================

  /**
   * Get current stock for a product across all warehouses
   */
  async getProductStock(productId: number): Promise<StockQuant[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.stockQuantRepository.find({
      where: { productId },
      relations: ['product', 'warehouse', 'unitOfMeasure'],
      order: { warehouseId: 'ASC' },
    });
  }

  /**
   * Get stock for a specific product at a specific warehouse
   */
  async getStockAtWarehouse(
    productId: number,
    warehouseId: number,
  ): Promise<StockQuant> {
    let stockQuant = await this.stockQuantRepository.findOne({
      where: { productId, warehouseId },
      relations: ['product', 'warehouse', 'unitOfMeasure'],
    });

    // If doesn't exist, create with zero quantities
    if (!stockQuant) {
      stockQuant = this.stockQuantRepository.create({
        productId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        incomingQuantity: 0,
        outgoingQuantity: 0,
      });
    }

    return stockQuant;
  }

  /**
   * Get all stock at a specific warehouse
   */
  async getWarehouseStock(warehouseId: number): Promise<StockQuant[]> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    return this.stockQuantRepository.find({
      where: { warehouseId },
      relations: ['product', 'warehouse', 'unitOfMeasure'],
      order: { productId: 'ASC' },
    });
  }

  /**
   * Get aggregated stock across all warehouses
   */
  async getAllStock(): Promise<any[]> {
    const query = `
      SELECT 
        p.id as "productId",
        p.name as "productName",
        p.code as "productCode",
        COALESCE(SUM(sq.quantity), 0) as "totalQuantity",
        COALESCE(SUM(sq."reservedQuantity"), 0) as "totalReserved",
        COALESCE(SUM(sq."availableQuantity"), 0) as "totalAvailable",
        COALESCE(SUM(sq."incomingQuantity"), 0) as "totalIncoming",
        COALESCE(SUM(sq."outgoingQuantity"), 0) as "totalOutgoing",
        COUNT(DISTINCT sq."warehouseId") as "warehouseCount"
      FROM products p
      LEFT JOIN stock_quants sq ON p.id = sq."productId"
      WHERE p."isEnabled" = true
      GROUP BY p.id, p.name, p.code
      HAVING COALESCE(SUM(sq.quantity), 0) > 0 OR COALESCE(SUM(sq."incomingQuantity"), 0) > 0
      ORDER BY p.name ASC
    `;

    return this.dataSource.query(query);
  }

  /**
   * Update stock quantity
   */
  async updateStockQuant(
    productId: number,
    warehouseId: number,
    quantityChange: number,
    options: {
      lotNumber?: string;
      serialNumber?: string;
      unitOfMeasureId?: number;
    } = {},
  ): Promise<StockQuant> {
    // Ensure quantityChange is a number
    const numericChange = parseFloat(quantityChange.toString());

    let stockQuant = await this.stockQuantRepository.findOne({
      where: { productId, warehouseId },
    });

    if (!stockQuant) {
      // Create new stock quant
      stockQuant = this.stockQuantRepository.create({
        productId,
        warehouseId,
        quantity: numericChange,
        reservedQuantity: 0,
        incomingQuantity: 0,
        outgoingQuantity: 0,
        lotNumber: options.lotNumber,
        serialNumber: options.serialNumber,
        unitOfMeasureId: options.unitOfMeasureId,
      });
    } else {
      // Ensure numeric addition by converting to numbers
      const currentQty = parseFloat(stockQuant.quantity.toString() || '0');
      stockQuant.quantity = currentQty + numericChange;
      if (options.lotNumber) stockQuant.lotNumber = options.lotNumber;
      if (options.serialNumber) stockQuant.serialNumber = options.serialNumber;
      if (options.unitOfMeasureId)
        stockQuant.unitOfMeasureId = options.unitOfMeasureId;
    }

    // Calculate available quantity (ensure numeric operation)
    stockQuant.availableQuantity = calcAvailableQty(
      stockQuant.quantity,
      stockQuant.reservedQuantity,
    );

    return this.stockQuantRepository.save(stockQuant);
  }

  // ==================== STOCK MOVEMENT OPERATIONS ====================

  /**
   * Create a new stock movement (draft status)
   */
  async createMovement(
    createDto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    // Validate all referenced entities in parallel
    const [product, sourceWarehouse, destWarehouse, uom] = await Promise.all([
      this.productRepository.findOne({ where: { id: createDto.productId } }),
      createDto.sourceWarehouseId
        ? this.warehouseRepository.findOne({
            where: { id: createDto.sourceWarehouseId },
          })
        : null,
      createDto.destWarehouseId
        ? this.warehouseRepository.findOne({
            where: { id: createDto.destWarehouseId },
          })
        : null,
      createDto.unitOfMeasureId
        ? this.uomRepository.findOne({
            where: { id: createDto.unitOfMeasureId },
          })
        : null,
    ]);
    if (!product)
      throw new NotFoundException(
        `Product with ID ${createDto.productId} not found`,
      );
    if (createDto.sourceWarehouseId && !sourceWarehouse)
      throw new NotFoundException(
        `Source warehouse with ID ${createDto.sourceWarehouseId} not found`,
      );
    if (createDto.destWarehouseId && !destWarehouse)
      throw new NotFoundException(
        `Destination warehouse with ID ${createDto.destWarehouseId} not found`,
      );
    if (createDto.unitOfMeasureId && !uom)
      throw new NotFoundException(
        `Unit of measure with ID ${createDto.unitOfMeasureId} not found`,
      );

    // Generate reference number
    const reference = await this.generateMovementReference(
      createDto.movementType,
    );

    const movement = this.stockMovementRepository.create({
      ...createDto,
      reference,
      status: MovementStatus.DRAFT,
    });

    return this.stockMovementRepository.save(movement);
  }

  /**
   * Validate/Execute a stock movement
   */
  async validateMovement(
    validateDto: ValidateMovementDto,
  ): Promise<StockMovement> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id: validateDto.movementId },
      relations: ['product', 'sourceWarehouse', 'destWarehouse'],
    });

    if (!movement) {
      throw new NotFoundException(
        `Movement with ID ${validateDto.movementId} not found`,
      );
    }

    if (movement.status === MovementStatus.DONE) {
      throw new BadRequestException('Movement already validated');
    }

    if (movement.status === MovementStatus.CANCELLED) {
      throw new BadRequestException('Cannot validate cancelled movement');
    }

    // Check stock availability for outgoing movements
    // Skip validation for RECEIPT and ADJUSTMENT movements
    if (
      movement.sourceWarehouseId &&
      movement.movementType !== MovementType.RECEIPT &&
      movement.movementType !== MovementType.ADJUSTMENT
    ) {
      const stockQuant = await this.getStockAtWarehouse(
        movement.productId,
        movement.sourceWarehouseId,
      );

      if (stockQuant.availableQuantity < movement.quantity) {
        throw new BadRequestException(
          `Insufficient stock at ${movement.sourceWarehouse?.name}. ` +
            `Available: ${stockQuant.availableQuantity}, Required: ${movement.quantity}`,
        );
      }
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update source warehouse stock (decrease) — uses manager to stay atomic
      if (movement.sourceWarehouseId) {
        await this._updateStockQuantWithManager(
          queryRunner.manager,
          movement.productId,
          movement.sourceWarehouseId,
          -movement.quantity,
          {
            lotNumber: movement.lotNumber,
            serialNumber: movement.serialNumber,
            unitOfMeasureId: movement.unitOfMeasureId,
          },
        );
      }

      // Update destination warehouse stock (increase) — uses manager to stay atomic
      if (movement.destWarehouseId) {
        await this._updateStockQuantWithManager(
          queryRunner.manager,
          movement.productId,
          movement.destWarehouseId,
          movement.quantity,
          {
            lotNumber: movement.lotNumber,
            serialNumber: movement.serialNumber,
            unitOfMeasureId: movement.unitOfMeasureId,
          },
        );
      }

      // Update movement status
      movement.status = MovementStatus.DONE;
      movement.dateDone = new Date();
      movement.validatedByUserId = validateDto.userId ?? null;

      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      return movement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Internal transfer between warehouses
   */
  async internalTransfer(
    transferDto: InternalTransferDto,
  ): Promise<StockMovement> {
    if (transferDto.sourceWarehouseId === transferDto.destWarehouseId) {
      throw new BadRequestException(
        'Source and destination warehouses cannot be the same',
      );
    }

    // Create movement
    const movementDto: CreateStockMovementDto = {
      movementType: MovementType.INTERNAL,
      productId: transferDto.productId,
      sourceWarehouseId: transferDto.sourceWarehouseId,
      destWarehouseId: transferDto.destWarehouseId,
      quantity: transferDto.quantity,
      unitOfMeasureId: transferDto.unitOfMeasureId,
      notes: transferDto.notes,
    };

    const movement = await this.createMovement(movementDto);

    // Auto-validate internal transfers
    return this.validateMovement({ movementId: movement.id });
  }

  /**
   * Get movement by ID
   */
  async findMovement(id: number): Promise<StockMovement> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id },
      relations: [
        'product',
        'sourceWarehouse',
        'destWarehouse',
        'unitOfMeasure',
      ],
    });

    if (!movement) {
      throw new NotFoundException(`Movement with ID ${id} not found`);
    }

    return movement;
  }

  /**
   * Get all movements with filters
   */
  async findAllMovements(filters?: {
    productId?: number;
    warehouseId?: number;
    status?: MovementStatus;
    movementType?: MovementType;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }): Promise<StockMovement[]> {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('product.saleUnitOfMeasure', 'saleUom')
      .leftJoinAndSelect('movement.sourceWarehouse', 'sourceWarehouse')
      .leftJoinAndSelect('movement.destWarehouse', 'destWarehouse')
      .leftJoinAndSelect('movement.unitOfMeasure', 'unitOfMeasure');

    if (filters?.productId) {
      query.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters?.warehouseId) {
      query.andWhere(
        '(movement.sourceWarehouseId = :warehouseId OR movement.destWarehouseId = :warehouseId)',
        { warehouseId: filters.warehouseId },
      );
    }

    if (filters?.status) {
      query.andWhere('movement.status = :status', { status: filters.status });
    }

    if (filters?.movementType) {
      query.andWhere('movement.movementType = :movementType', {
        movementType: filters.movementType,
      });
    }

    if (filters?.startDate) {
      query.andWhere('movement.dateCreated >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('movement.dateCreated <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(movement.reference) LIKE :search OR LOWER(product.name) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }

    query.orderBy('movement.dateCreated', 'DESC');

    const movements = await query.getMany();

    // Backfill unitOfMeasure from the product's sale UOM for movements that
    // were created before unitOfMeasureId was populated (legacy data).
    for (const m of movements) {
      if (!m.unitOfMeasure && m.product?.saleUnitOfMeasure) {
        m.unitOfMeasure = m.product.saleUnitOfMeasure;
        m.unitOfMeasureId = m.product.saleUnitId;
      }
    }

    return movements;
  }

  /**
   * Update movement (only if not validated)
   */
  async updateMovement(
    id: number,
    updateDto: UpdateStockMovementDto,
  ): Promise<StockMovement> {
    const movement = await this.findMovement(id);

    if (movement.status === MovementStatus.DONE) {
      throw new BadRequestException('Cannot update validated movement');
    }

    Object.assign(movement, updateDto);
    return this.stockMovementRepository.save(movement);
  }

  /**
   * Cancel movement
   */
  async cancelMovement(id: number): Promise<StockMovement> {
    const movement = await this.findMovement(id);

    if (movement.status === MovementStatus.DONE) {
      throw new BadRequestException(
        'Cannot cancel validated movement. Create a reversal instead.',
      );
    }

    movement.status = MovementStatus.CANCELLED;
    return this.stockMovementRepository.save(movement);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Internal transactional stock quant update that operates within an
   * existing EntityManager (e.g. a QueryRunner's manager).  All public callers
   * that don't own a transaction simply use `this.stockQuantRepository`.
   */
  async updateStockQuantWithManager(
    manager: EntityManager,
    productId: number,
    warehouseId: number,
    quantityChange: number,
    options: {
      lotNumber?: string;
      serialNumber?: string;
      unitOfMeasureId?: number;
    } = {},
  ): Promise<StockQuant> {
    return this._updateStockQuantWithManager(
      manager,
      productId,
      warehouseId,
      quantityChange,
      options,
    );
  }

  private async _updateStockQuantWithManager(
    manager: EntityManager,
    productId: number,
    warehouseId: number,
    quantityChange: number,
    options: {
      lotNumber?: string;
      serialNumber?: string;
      unitOfMeasureId?: number;
    } = {},
  ): Promise<StockQuant> {
    const numericChange = parseFloat(quantityChange.toString());

    let stockQuant = await manager.findOne(StockQuant, {
      where: { productId, warehouseId },
    });

    if (!stockQuant) {
      stockQuant = manager.create(StockQuant, {
        productId,
        warehouseId,
        quantity: numericChange,
        reservedQuantity: 0,
        incomingQuantity: 0,
        outgoingQuantity: 0,
        lotNumber: options.lotNumber,
        serialNumber: options.serialNumber,
        unitOfMeasureId: options.unitOfMeasureId,
      });
    } else {
      const currentQty = parseFloat(stockQuant.quantity.toString() || '0');
      stockQuant.quantity = currentQty + numericChange;
      if (options.lotNumber) stockQuant.lotNumber = options.lotNumber;
      if (options.serialNumber) stockQuant.serialNumber = options.serialNumber;
      if (options.unitOfMeasureId)
        stockQuant.unitOfMeasureId = options.unitOfMeasureId;
    }

    stockQuant.availableQuantity = calcAvailableQty(
      stockQuant.quantity,
      stockQuant.reservedQuantity,
    );

    return manager.save(StockQuant, stockQuant);
  }

  /**
   * Update only the pending (forecast) quantities on a StockQuant row, within
   * an existing EntityManager.  Does NOT touch `quantity`.
   *
   * type = 'outgoing' → updates outgoingQuantity AND reservedQuantity, then
   *                      recalculates availableQuantity.
   * type = 'incoming' → updates incomingQuantity only.
   *
   * Values are always clamped to ≥ 0.
   */
  private async _updatePendingQuantWithManager(
    manager: EntityManager,
    productId: number,
    warehouseId: number,
    type: 'incoming' | 'outgoing',
    delta: number,
  ): Promise<void> {
    let stockQuant = await manager.findOne(StockQuant, {
      where: { productId, warehouseId },
    });

    if (!stockQuant) {
      stockQuant = manager.create(StockQuant, {
        productId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        incomingQuantity: 0,
        outgoingQuantity: 0,
      });
    }

    const numericDelta = parseFloat(delta.toString());

    if (type === 'incoming') {
      const current = parseFloat(stockQuant.incomingQuantity.toString() || '0');
      stockQuant.incomingQuantity = Math.max(0, current + numericDelta);
    } else {
      const currentOut = parseFloat(
        stockQuant.outgoingQuantity.toString() || '0',
      );
      const currentRes = parseFloat(
        stockQuant.reservedQuantity.toString() || '0',
      );
      stockQuant.outgoingQuantity = Math.max(0, currentOut + numericDelta);
      stockQuant.reservedQuantity = Math.max(0, currentRes + numericDelta);
      stockQuant.availableQuantity = calcAvailableQty(
        stockQuant.quantity,
        stockQuant.reservedQuantity,
      );
    }

    await manager.save(StockQuant, stockQuant);
  }

  /**
   * Add or remove pending (forecast) quantities for a list of items, in a
   * single atomic transaction.
   *
   * Call with delta = 1  when a document is confirmed (order validated).
   * Call with delta = -1 when a document is cancelled / devalidated.
   */
  async updatePendingQuantitiesForDocument(params: {
    items: Array<{ productId: number; quantity: number }>;
    warehouseId: number;
    type: 'incoming' | 'outgoing';
    delta: 1 | -1;
  }): Promise<void> {
    const { items, warehouseId, type, delta } = params;
    const validItems = items.filter((i) => !!i.productId && i.quantity > 0);
    if (validItems.length === 0) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of validItems) {
        await this._updatePendingQuantWithManager(
          queryRunner.manager,
          item.productId,
          warehouseId,
          type,
          delta * item.quantity,
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== DOCUMENT-DRIVEN STOCK OPERATIONS ====================

  /**
   * Apply stock movements for a business document (order or invoice).
   *
   * Idempotent — if DONE movements already exist for the same
   * (sourceDocumentType, sourceDocumentId) pair, the call is a no-op.
   *
   * All writes are wrapped in a single database transaction.
   */
  async processDocumentStockMovements(params: {
    sourceDocumentType: SourceDocumentType;
    sourceDocumentId: number;
    items: Array<{ productId: number; quantity: number }>;
    warehouseId: number;
    movementType: MovementType;
    origin: string;
    partnerName?: string;
  }): Promise<StockMovement[]> {
    const {
      sourceDocumentType,
      sourceDocumentId,
      items,
      warehouseId,
      movementType,
      origin,
      partnerName,
    } = params;

    // ── Idempotency guard ────────────────────────────────────────────────────
    const existing = await this.stockMovementRepository.find({
      where: {
        sourceDocumentType,
        sourceDocumentId,
        status: MovementStatus.DONE,
      },
    });
    if (existing.length > 0) {
      this.logger.warn(
        `Stock movements already processed for ${sourceDocumentType} #${sourceDocumentId} — skipping.`,
      );
      return existing;
    }

    const isOutgoing =
      movementType === MovementType.DELIVERY ||
      movementType === MovementType.RETURN_OUT ||
      movementType === MovementType.PRODUCTION_OUT ||
      movementType === MovementType.SCRAP;

    const validItems = items.filter((i) => !!i.productId && i.quantity > 0);

    if (validItems.length === 0) return [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const results: StockMovement[] = [];

    try {
      for (const item of validItems) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          relations: ['saleUnitOfMeasure', 'purchaseUnitOfMeasure'],
        });
        if (!product) {
          this.logger.warn(
            `Product #${item.productId} not found — skipping stock movement.`,
          );
          continue;
        }

        // Resolve UOM: outgoing movements use sale UOM, incoming use purchase UOM
        const unitOfMeasureId = isOutgoing
          ? (product.saleUnitId ?? product.purchaseUnitId ?? undefined)
          : (product.purchaseUnitId ?? product.saleUnitId ?? undefined);

        // Stock availability check for outgoing movements
        if (isOutgoing) {
          const stockQuant = await queryRunner.manager.findOne(StockQuant, {
            where: { productId: item.productId, warehouseId },
          });
          const available = stockQuant
            ? parseFloat(stockQuant.availableQuantity.toString() || '0')
            : 0;
          if (available < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product #${item.productId}. ` +
                `Available: ${available}, Required: ${item.quantity}`,
            );
          }
        }

        const reference = await this.generateMovementReference(movementType);

        const movement = queryRunner.manager.create(StockMovement, {
          reference,
          movementType,
          productId: item.productId,
          quantity: item.quantity,
          unitOfMeasureId,
          ...(isOutgoing
            ? { sourceWarehouseId: warehouseId }
            : { destWarehouseId: warehouseId }),
          origin,
          partnerName: partnerName ?? undefined,
          sourceDocumentType,
          sourceDocumentId,
          status: MovementStatus.DONE,
          dateDone: new Date(),
        });

        await queryRunner.manager.save(StockMovement, movement);

        // Update stock quants atomically
        await this._updateStockQuantWithManager(
          queryRunner.manager,
          item.productId,
          warehouseId,
          isOutgoing ? -item.quantity : item.quantity,
        );

        // Clear pending (forecast) quantities that were set when the document
        // was confirmed/validated.  Clamped to ≥ 0 so no harm if none was set.
        if (isOutgoing) {
          // Physical delivery clears the outgoing/reserved forecast
          await this._updatePendingQuantWithManager(
            queryRunner.manager,
            item.productId,
            warehouseId,
            'outgoing',
            -item.quantity,
          );
        } else if (movementType === MovementType.RECEIPT) {
          // Physical receipt clears the incoming forecast
          await this._updatePendingQuantWithManager(
            queryRunner.manager,
            item.productId,
            warehouseId,
            'incoming',
            -item.quantity,
          );
        }

        results.push(movement);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reverse all DONE stock movements for a given document.
   *
   * Creates counter-movements (RETURN_IN for a previous DELIVERY, etc.)
   * and updates stock quants atomically.  Idempotent — already-reversed
   * documents are skipped.
   *
   * options.restorePending = true → also restores the forecast quantities
   * (outgoing/reserved or incoming) that were cleared when the original
   * physical movement ran.  Pass this when devalidating an invoice so the
   * associated order's forecast is visible again.
   */
  async reverseDocumentStockMovements(
    sourceDocumentType: SourceDocumentType,
    sourceDocumentId: number,
    options?: { restorePending?: boolean },
  ): Promise<void> {
    const doneMoves = await this.stockMovementRepository.find({
      where: {
        sourceDocumentType,
        sourceDocumentId,
        status: MovementStatus.DONE,
      },
    });

    if (doneMoves.length === 0) {
      this.logger.debug(
        `No DONE movements found for ${sourceDocumentType} #${sourceDocumentId} — nothing to reverse.`,
      );
      return;
    }

    const reversalTypeMap: Partial<Record<MovementType, MovementType>> = {
      [MovementType.DELIVERY]: MovementType.RETURN_IN,
      [MovementType.RECEIPT]: MovementType.RETURN_OUT,
      [MovementType.RETURN_IN]: MovementType.DELIVERY,
      [MovementType.RETURN_OUT]: MovementType.RECEIPT,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const move of doneMoves) {
        const reversalType =
          reversalTypeMap[move.movementType] ?? MovementType.ADJUSTMENT;
        const reference = await this.generateMovementReference(reversalType);

        const reversal = queryRunner.manager.create(StockMovement, {
          reference,
          movementType: reversalType,
          productId: move.productId,
          quantity: move.quantity,
          // Swap source ↔ destination
          sourceWarehouseId: move.destWarehouseId,
          destWarehouseId: move.sourceWarehouseId,
          origin: `REV:${move.origin ?? move.reference}`,
          partnerName: move.partnerName,
          sourceDocumentType,
          sourceDocumentId,
          status: MovementStatus.DONE,
          dateDone: new Date(),
          notes: `Reversal of movement #${move.id}`,
        });

        await queryRunner.manager.save(StockMovement, reversal);

        // Undo the quant change from the original movement
        if (move.destWarehouseId) {
          // Original increased dest → now decrease dest
          await this._updateStockQuantWithManager(
            queryRunner.manager,
            move.productId,
            move.destWarehouseId,
            -move.quantity,
          );
        }
        if (move.sourceWarehouseId) {
          // Original decreased source → now increase source
          await this._updateStockQuantWithManager(
            queryRunner.manager,
            move.productId,
            move.sourceWarehouseId,
            move.quantity,
          );
        }

        // Restore pending (forecast) quantities when requested.
        // Used by invoice devalidation to return to "order validated, invoice pending" state.
        if (options?.restorePending) {
          if (
            move.movementType === MovementType.DELIVERY &&
            move.sourceWarehouseId
          ) {
            // Was an outgoing delivery → restore outgoing + reserved forecast
            await this._updatePendingQuantWithManager(
              queryRunner.manager,
              move.productId,
              move.sourceWarehouseId,
              'outgoing',
              move.quantity,
            );
          } else if (
            move.movementType === MovementType.RECEIPT &&
            move.destWarehouseId
          ) {
            // Was an incoming receipt → restore incoming forecast
            await this._updatePendingQuantWithManager(
              queryRunner.manager,
              move.productId,
              move.destWarehouseId,
              'incoming',
              move.quantity,
            );
          }
        }

        // Mark original movement as cancelled so it's no longer "DONE"
        move.status = MovementStatus.CANCELLED;
        await queryRunner.manager.save(StockMovement, move);
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Reversed ${doneMoves.length} stock movement(s) for ${sourceDocumentType} #${sourceDocumentId}.`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate unique movement reference number
   */
  private async generateMovementReference(
    movementType: MovementType,
  ): Promise<string> {
    const prefixMap = {
      [MovementType.RECEIPT]: 'IN',
      [MovementType.DELIVERY]: 'OUT',
      [MovementType.INTERNAL]: 'INT',
      [MovementType.ADJUSTMENT]: 'ADJ',
      [MovementType.PRODUCTION_IN]: 'PROD-IN',
      [MovementType.PRODUCTION_OUT]: 'PROD-OUT',
      [MovementType.RETURN_IN]: 'RET-IN',
      [MovementType.RETURN_OUT]: 'RET-OUT',
      [MovementType.SCRAP]: 'SCRAP',
    };

    const prefix = prefixMap[movementType] || 'MOV';
    const year = new Date().getFullYear();

    // Get last reference for this type
    const lastMovement = await this.stockMovementRepository.findOne({
      where: { movementType },
      order: { id: 'DESC' },
    });

    let sequence = 1;
    if (lastMovement) {
      const lastRef = lastMovement.reference;
      const match = lastRef.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}/${year}/${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(
    productId: number,
    warehouseId: number,
    quantity: number,
  ): Promise<StockQuant> {
    const stockQuant = await this.getStockAtWarehouse(productId, warehouseId);

    if (stockQuant.availableQuantity < quantity) {
      throw new BadRequestException(
        `Insufficient available stock. Available: ${stockQuant.availableQuantity}, Required: ${quantity}`,
      );
    }

    stockQuant.reservedQuantity += quantity;
    stockQuant.availableQuantity = calcAvailableQty(
      stockQuant.quantity,
      stockQuant.reservedQuantity,
    );

    return this.stockQuantRepository.save(stockQuant);
  }

  /**
   * Unreserve stock
   */
  async unreserveStock(
    productId: number,
    warehouseId: number,
    quantity: number,
  ): Promise<StockQuant> {
    const stockQuant = await this.getStockAtWarehouse(productId, warehouseId);

    stockQuant.reservedQuantity = Math.max(
      0,
      stockQuant.reservedQuantity - quantity,
    );
    stockQuant.availableQuantity = calcAvailableQty(
      stockQuant.quantity,
      stockQuant.reservedQuantity,
    );

    return this.stockQuantRepository.save(stockQuant);
  }

  /**
   * Get low stock products (where quantity < threshold)
   */
  async getLowStockProducts(threshold: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        p.id as "productId",
        p.name as "productName",
        p.code as "productCode",
        COALESCE(SUM(sq.quantity), 0) as "totalQuantity",
        COALESCE(SUM(sq."availableQuantity"), 0) as "availableQuantity"
      FROM products p
      LEFT JOIN stock_quants sq ON p.id = sq."productId"
      WHERE p."isEnabled" = true AND p."isService" = false
      GROUP BY p.id, p.name, p.code
      HAVING COALESCE(SUM(sq.quantity), 0) < $1
      ORDER BY COALESCE(SUM(sq.quantity), 0) ASC
    `;

    return this.dataSource.query(query, [threshold]);
  }

  /**
   * Get stock value (quantity * cost)
   */
  async getStockValue(): Promise<{ totalValue: number; productCount: number }> {
    const query = `
      SELECT 
        COALESCE(SUM(sq.quantity * p.cost), 0) as "totalValue",
        COUNT(DISTINCT p.id) as "productCount"
      FROM stock_quants sq
      JOIN products p ON sq."productId" = p.id
      WHERE sq.quantity > 0
    `;

    const result: { totalValue: number; productCount: number }[] =
      await this.dataSource.query(query);
    return result[0];
  }
}
