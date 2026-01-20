import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  InventoryAdjustment, 
  AdjustmentLine, 
  AdjustmentStatus 
} from './entities/inventory-adjustment.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import {
  CreateInventoryAdjustmentDto,
  UpdateInventoryAdjustmentDto,
  ValidateAdjustmentDto,
} from './dto/inventory-adjustment.dto';
import { StockService } from './stock.service';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepository: Repository<InventoryAdjustment>,
    @InjectRepository(AdjustmentLine)
    private readonly adjustmentLineRepository: Repository<AdjustmentLine>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    private readonly stockService: StockService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new inventory adjustment
   */
  async create(createDto: CreateInventoryAdjustmentDto): Promise<InventoryAdjustment> {
    // Validate warehouse
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: createDto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${createDto.warehouseId} not found`);
    }

    // Generate reference
    const reference = await this.generateAdjustmentReference();

    const adjustment = this.adjustmentRepository.create({
      ...createDto,
      reference,
      status: AdjustmentStatus.DRAFT,
    });

    const saved = await this.adjustmentRepository.save(adjustment);

    // Add lines if provided
    if (createDto.lines && createDto.lines.length > 0) {
      for (const lineDto of createDto.lines) {
        // Validate product
        const product = await this.productRepository.findOne({
          where: { id: lineDto.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product with ID ${lineDto.productId} not found`);
        }

        // Calculate difference
        const difference = lineDto.countedQuantity - lineDto.theoreticalQuantity;

        const line = this.adjustmentLineRepository.create({
          ...lineDto,
          adjustmentId: saved.id,
          difference,
        });

        await this.adjustmentLineRepository.save(line);
      }
    }

    return this.findOne(saved.id);
  }

  /**
   * Find adjustment by ID
   */
  async findOne(id: number): Promise<InventoryAdjustment> {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id },
      relations: ['warehouse', 'lines'],
    });

    if (!adjustment) {
      throw new NotFoundException(`Inventory adjustment with ID ${id} not found`);
    }

    return adjustment;
  }

  /**
   * Find all adjustments
   */
  async findAll(filters?: {
    warehouseId?: number;
    status?: AdjustmentStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<InventoryAdjustment[]> {
    const query = this.adjustmentRepository.createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.warehouse', 'warehouse')
      .leftJoinAndSelect('adjustment.lines', 'lines');

    if (filters?.warehouseId) {
      query.andWhere('adjustment.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.status) {
      query.andWhere('adjustment.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere('adjustment.dateCreated >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('adjustment.dateCreated <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('adjustment.dateCreated', 'DESC');

    return query.getMany();
  }

  /**
   * Update adjustment (only if not validated)
   */
  async update(id: number, updateDto: UpdateInventoryAdjustmentDto): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    if (adjustment.status === AdjustmentStatus.DONE) {
      throw new BadRequestException('Cannot update validated adjustment');
    }

    // Update basic fields
    if (updateDto.name) adjustment.name = updateDto.name;
    if (updateDto.notes !== undefined) adjustment.notes = updateDto.notes;
    if (updateDto.status) adjustment.status = updateDto.status;

    // Update lines if provided
    if (updateDto.lines) {
      // Delete existing lines
      await this.adjustmentLineRepository.delete({ adjustmentId: id });

      // Add new lines
      for (const lineDto of updateDto.lines) {
        // Validate product
        const product = await this.productRepository.findOne({
          where: { id: lineDto.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product with ID ${lineDto.productId} not found`);
        }

        const difference = lineDto.countedQuantity - lineDto.theoreticalQuantity;

        const line = this.adjustmentLineRepository.create({
          ...lineDto,
          adjustmentId: id,
          difference,
        });

        await this.adjustmentLineRepository.save(line);
      }
    }

    await this.adjustmentRepository.save(adjustment);

    return this.findOne(id);
  }

  /**
   * Start counting (set status to IN_PROGRESS)
   */
  async startCounting(id: number): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    if (adjustment.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException('Can only start counting for draft adjustments');
    }

    adjustment.status = AdjustmentStatus.IN_PROGRESS;
    await this.adjustmentRepository.save(adjustment);

    return this.findOne(id);
  }

  /**
   * Validate adjustment and create stock movements
   */
  async validate(validateDto: ValidateAdjustmentDto): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(validateDto.adjustmentId);

    if (adjustment.status === AdjustmentStatus.DONE) {
      throw new BadRequestException('Adjustment already validated');
    }

    if (adjustment.status === AdjustmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot validate cancelled adjustment');
    }

    if (!adjustment.lines || adjustment.lines.length === 0) {
      throw new BadRequestException('Cannot validate adjustment without lines');
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create stock movements for each line with difference
      for (const line of adjustment.lines) {
        if (line.difference !== 0) {
          // Determine source and destination based on difference sign
          let sourceWarehouseId: number | undefined;
          let destWarehouseId: number | undefined;
          const quantity = Math.abs(line.difference);

          if (line.difference > 0) {
            // Increase: from inventory warehouse to counted warehouse
            destWarehouseId = adjustment.warehouseId;
          } else {
            // Decrease: from counted warehouse to inventory warehouse (scrap)
            sourceWarehouseId = adjustment.warehouseId;
          }

          // Create stock movement
          const movement = this.stockMovementRepository.create({
            reference: await this.generateMovementReference(),
            movementType: MovementType.ADJUSTMENT,
            productId: line.productId,
            sourceWarehouseId,
            destWarehouseId,
            quantity,
            status: 'done' as any,
            dateDone: new Date(),
            validatedByUserId: validateDto.userId,
            origin: `Adjustment: ${adjustment.reference}`,
            lotNumber: line.lotNumber,
            serialNumber: line.serialNumber,
            notes: `Adjustment difference: ${line.difference}`,
          });

          await queryRunner.manager.save(movement);

          // Update stock quant
          if (line.difference > 0) {
            // Increase stock
            await this.stockService.updateStockQuant(
              line.productId,
              adjustment.warehouseId,
              quantity,
              {
                lotNumber: line.lotNumber,
                serialNumber: line.serialNumber,
              },
            );
          } else {
            // Decrease stock
            await this.stockService.updateStockQuant(
              line.productId,
              adjustment.warehouseId,
              -quantity,
              {
                lotNumber: line.lotNumber,
                serialNumber: line.serialNumber,
              },
            );
          }
        }
      }

      // Update adjustment status
      adjustment.status = AdjustmentStatus.DONE;
      adjustment.adjustmentDate = new Date();
      adjustment.userId = validateDto.userId ?? null;

      await queryRunner.manager.save(adjustment);

      await queryRunner.commitTransaction();

      return this.findOne(adjustment.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancel adjustment
   */
  async cancel(id: number): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    if (adjustment.status === AdjustmentStatus.DONE) {
      throw new BadRequestException('Cannot cancel validated adjustment');
    }

    adjustment.status = AdjustmentStatus.CANCELLED;
    await this.adjustmentRepository.save(adjustment);

    return this.findOne(id);
  }

  /**
   * Delete adjustment (only if draft)
   */
  async remove(id: number): Promise<void> {
    const adjustment = await this.findOne(id);

    if (adjustment.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft adjustments');
    }

    await this.adjustmentRepository.delete(id);
  }

  /**
   * Generate products list for counting (pre-fill theoretical quantities)
   */
  async generateCountingList(warehouseId: number): Promise<any[]> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    const query = `
      SELECT 
        p.id as "productId",
        p.name as "productName",
        p.code as "productCode",
        COALESCE(sq.quantity, 0) as "theoreticalQuantity",
        sq."lotNumber",
        sq."serialNumber"
      FROM products p
      LEFT JOIN stock_quants sq ON p.id = sq."productId" AND sq."warehouseId" = $1
      WHERE p."isEnabled" = true AND p."isService" = false
      ORDER BY p.name ASC
    `;

    return this.dataSource.query(query, [warehouseId]);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate unique adjustment reference
   */
  private async generateAdjustmentReference(): Promise<string> {
    const year = new Date().getFullYear();

    const lastAdjustment = await this.adjustmentRepository.findOne({
      order: { id: 'DESC' },
    });

    let sequence = 1;
    if (lastAdjustment) {
      const match = lastAdjustment.reference.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `ADJ/${year}/${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * Generate movement reference for adjustment
   */
  private async generateMovementReference(): Promise<string> {
    const year = new Date().getFullYear();

    const lastMovement = await this.stockMovementRepository.findOne({
      where: { movementType: MovementType.ADJUSTMENT },
      order: { id: 'DESC' },
    });

    let sequence = 1;
    if (lastMovement) {
      const match = lastMovement.reference.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `ADJ/${year}/${sequence.toString().padStart(5, '0')}`;
  }
}
