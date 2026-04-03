import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import {
  InventoryAdjustment,
  AdjustmentLine,
  AdjustmentStatus,
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
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { AdjustmentLineDto } from './dto/inventory-adjustment.dto';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly stockService: StockService,
  ) { }

  private get adjustmentRepository(): Repository<InventoryAdjustment> {
    return this.tenantConnService.getRepository(InventoryAdjustment);
  }

  private get adjustmentLineRepository(): Repository<AdjustmentLine> {
    return this.tenantConnService.getRepository(AdjustmentLine);
  }

  private get warehouseRepository(): Repository<Warehouse> {
    return this.tenantConnService.getRepository(Warehouse);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private get stockMovementRepository(): Repository<StockMovement> {
    return this.tenantConnService.getRepository(StockMovement);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  /**
   * Create a new inventory adjustment
   */
  async create(
    createDto: CreateInventoryAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    // Validate warehouse
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: createDto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(
        `Warehouse with ID ${createDto.warehouseId} not found`,
      );
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
        await this.saveAdjustmentLine(lineDto, saved.id);
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
      relations: ['warehouse', 'lines', 'lines.product'],
    });

    if (!adjustment) {
      throw new NotFoundException(
        `Inventory adjustment with ID ${id} not found`,
      );
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
    const query = this.adjustmentRepository
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.warehouse', 'warehouse');

    if (filters?.warehouseId) {
      query.andWhere('adjustment.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }

    if (filters?.status) {
      query.andWhere('adjustment.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere('adjustment.dateCreated >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('adjustment.dateCreated <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query.orderBy('adjustment.dateCreated', 'DESC');

    return query.getMany();
  }

  /**
   * Update adjustment (only if not validated)
   */
  async update(
    id: number,
    updateDto: UpdateInventoryAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    if (adjustment.status === AdjustmentStatus.DONE) {
      throw new BadRequestException('Cannot update validated adjustment');
    }

    // Update basic fields without triggering cascade on lines
    const basicUpdates: Partial<InventoryAdjustment> = {};
    if (updateDto.name) basicUpdates.name = updateDto.name;
    if (updateDto.notes !== undefined) basicUpdates.notes = updateDto.notes;
    if (updateDto.status) basicUpdates.status = updateDto.status;

    if (Object.keys(basicUpdates).length > 0) {
      await this.adjustmentRepository.update(id, basicUpdates);
    }

    // Update lines if provided (delete + batch re-insert, no cascade involved)
    if (updateDto.lines) {
      await this.adjustmentLineRepository.delete({ adjustmentId: id });
      await this.saveLinesInBatch(updateDto.lines, id);
    }

    return this.findOne(id);
  }

  /**
   * Start counting (set status to IN_PROGRESS)
   */
  async startCounting(id: number): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    if (adjustment.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException(
        'Can only start counting for draft adjustments',
      );
    }

    adjustment.status = AdjustmentStatus.IN_PROGRESS;
    return this.adjustmentRepository.save(adjustment);
  }

  /**
   * Validate adjustment and create stock movements
   */
  async validate(
    validateDto: ValidateAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(validateDto.adjustmentId);

    if (adjustment.status === AdjustmentStatus.DONE) {
      throw new BadRequestException('Adjustment already validated');
    }

    if (adjustment.status === AdjustmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot validate cancelled adjustment');
    }

    // Lines may be empty if everything matched (no discrepancies) — that's valid

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Generate a base reference once before the loop to avoid duplicate keys
    // (movements inside the transaction are not yet visible to subsequent calls)
    const baseReference = await this.generateMovementReference();
    const [refPrefix, refYear, refSeq] = baseReference.split('/');
    let refCounter = parseInt(refSeq, 10);

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

          const reference = `${refPrefix}/${refYear}/${refCounter.toString().padStart(5, '0')}`;
          refCounter++;

          // Create stock movement
          const movement = this.stockMovementRepository.create({
            reference,
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

          // Update stock quant inside the same transaction
          const quantityChange = line.difference > 0 ? quantity : -quantity;
          await this.stockService.updateStockQuantWithManager(
            queryRunner.manager,
            line.productId,
            adjustment.warehouseId,
            quantityChange,
            {
              lotNumber: line.lotNumber,
              serialNumber: line.serialNumber,
            },
          );
        }
      }

      // Update adjustment status — direct UPDATE to avoid cascade on lines
      await queryRunner.manager.update(InventoryAdjustment, adjustment.id, {
        status: AdjustmentStatus.DONE,
        adjustmentDate: new Date(),
        userId: validateDto.userId ?? null,
      });

      await queryRunner.commitTransaction();

      return adjustment;
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
    return this.adjustmentRepository.save(adjustment);
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
  async generateCountingList(
    warehouseId: number,
    options: { search?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = (page - 1) * limit;
    const searchTerm = options.search?.trim();

    // Count query only filters by product — no warehouseId needed
    const countSearchFilter = searchTerm
      ? `AND (LOWER(p.name) LIKE $1 OR LOWER(p.code) LIKE $1)`
      : '';
    const countParams: any[] = [];
    if (searchTerm) countParams.push(`%${searchTerm.toLowerCase()}%`);

    // Data query also filters stock by warehouse ($1), search is $2 if present
    const dataSearchFilter = searchTerm
      ? `AND (LOWER(p.name) LIKE $2 OR LOWER(p.code) LIKE $2)`
      : '';
    const dataParams: any[] = [warehouseId];
    if (searchTerm) dataParams.push(`%${searchTerm.toLowerCase()}%`);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p."isEnabled" = true AND p."isService" = false
      ${countSearchFilter}
    `;
    const [{ total }] = await this.dataSource.query(countQuery, countParams);

    const dataQuery = `
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
      ${dataSearchFilter}
      ORDER BY p.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const data = await this.dataSource.query(dataQuery, dataParams);

    return { data, total: +total, page, limit };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Batch insert adjustment lines — no per-line product query
   */
  private async saveLinesInBatch(
    lineDtos: AdjustmentLineDto[],
    adjustmentId: number,
  ): Promise<void> {
    if (!lineDtos.length) return;
    const rows = lineDtos.map((lineDto) => ({
      adjustmentId,
      productId: lineDto.productId,
      theoreticalQuantity: lineDto.theoreticalQuantity,
      countedQuantity: lineDto.countedQuantity,
      difference: lineDto.countedQuantity - lineDto.theoreticalQuantity,
      lotNumber: lineDto.lotNumber ?? undefined,
      serialNumber: lineDto.serialNumber ?? undefined,
      notes: lineDto.notes ?? undefined,
    }));
    await this.adjustmentLineRepository.insert(rows);
  }

  private async saveAdjustmentLine(
    lineDto: AdjustmentLineDto,
    adjustmentId: number,
  ): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: lineDto.productId },
    });
    if (!product)
      throw new NotFoundException(
        `Product with ID ${lineDto.productId} not found`,
      );
    const difference = lineDto.countedQuantity - lineDto.theoreticalQuantity;
    await this.adjustmentLineRepository.save(
      this.adjustmentLineRepository.create({
        ...lineDto,
        adjustmentId,
        difference,
      }),
    );
  }

  private async generateRef(
    prefix: string,
    fetchLast: () => Promise<{ reference: string } | null>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const last = await fetchLast();
    let sequence = 1;
    if (last) {
      const match = last.reference.match(/(\d+)$/);
      if (match) sequence = parseInt(match[1]) + 1;
    }
    return `${prefix}/${year}/${sequence.toString().padStart(5, '0')}`;
  }

  private generateAdjustmentReference(): Promise<string> {
    return this.generateRef('ADJ', async () => {
      const results = await this.adjustmentRepository.find({
        order: { id: 'DESC' },
        take: 1,
      });
      return results[0] ?? null;
    });
  }

  private generateMovementReference(): Promise<string> {
    return this.generateRef('ADJ', async () => {
      const results = await this.stockMovementRepository.find({
        where: { movementType: MovementType.ADJUSTMENT },
        order: { id: 'DESC' },
        take: 1,
      });
      return results[0] ?? null;
    });
  }
}
