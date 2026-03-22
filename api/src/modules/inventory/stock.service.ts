import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { StockQuant } from './entities/stock-quant.entity';
import {
  StockMovement,
  MovementType,
  MovementStatus,
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

@Injectable()
export class StockService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
  ) { }

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
    const qty = parseFloat(stockQuant.quantity.toString() || '0');
    const reserved = parseFloat(stockQuant.reservedQuantity.toString() || '0');
    stockQuant.availableQuantity = qty - reserved;

    return this.stockQuantRepository.save(stockQuant);
  }

  // ==================== STOCK MOVEMENT OPERATIONS ====================

  /**
   * Create a new stock movement (draft status)
   */
  async createMovement(
    createDto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    // Validate product
    const product = await this.productRepository.findOne({
      where: { id: createDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createDto.productId} not found`,
      );
    }

    // Validate source warehouse if provided
    if (createDto.sourceWarehouseId) {
      const sourceWarehouse = await this.warehouseRepository.findOne({
        where: { id: createDto.sourceWarehouseId },
      });
      if (!sourceWarehouse) {
        throw new NotFoundException(
          `Source warehouse with ID ${createDto.sourceWarehouseId} not found`,
        );
      }
    }

    // Validate destination warehouse if provided
    if (createDto.destWarehouseId) {
      const destWarehouse = await this.warehouseRepository.findOne({
        where: { id: createDto.destWarehouseId },
      });
      if (!destWarehouse) {
        throw new NotFoundException(
          `Destination warehouse with ID ${createDto.destWarehouseId} not found`,
        );
      }
    }

    // Validate unit of measure if provided
    if (createDto.unitOfMeasureId) {
      const uom = await this.uomRepository.findOne({
        where: { id: createDto.unitOfMeasureId },
      });
      if (!uom) {
        throw new NotFoundException(
          `Unit of measure with ID ${createDto.unitOfMeasureId} not found`,
        );
      }
    }

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
      // Update source warehouse stock (decrease)
      if (movement.sourceWarehouseId) {
        await this.updateStockQuant(
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

      // Update destination warehouse stock (increase)
      if (movement.destWarehouseId) {
        await this.updateStockQuant(
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

      return this.findMovement(movement.id);
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
  }): Promise<StockMovement[]> {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
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

    query.orderBy('movement.dateCreated', 'DESC');

    return query.getMany();
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
    stockQuant.availableQuantity =
      stockQuant.quantity - stockQuant.reservedQuantity;

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
    stockQuant.availableQuantity =
      stockQuant.quantity - stockQuant.reservedQuantity;

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
