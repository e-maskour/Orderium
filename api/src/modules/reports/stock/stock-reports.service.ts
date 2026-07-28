import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { StockQuant } from '../../inventory/entities/stock-quant.entity';
import {
  StockMovement,
  MovementStatus,
} from '../../inventory/entities/stock-movement.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { Product } from '../../products/entities/product.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import {
  StockReportFilterDto,
  ReportFilterDto,
} from '../dto/report-filter.dto';

const TTL = 300_000;

@Injectable()
export class StockReportsService {
  private readonly logger = new Logger(StockReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private get stockQuantRepo() {
    return this.tenantConnService.getRepository(StockQuant);
  }
  private get stockMovementRepo() {
    return this.tenantConnService.getRepository(StockMovement);
  }
  private get warehouseRepo() {
    return this.tenantConnService.getRepository(Warehouse);
  }
  private get productRepo() {
    return this.tenantConnService.getRepository(Product);
  }

  private cacheKey(suffix: string, filter: object): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:stock:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Stock valuation — stock_quants.quantity * product.cost per product */
  async getStockValuation(filter: StockReportFilterDto) {
    const key = this.cacheKey('valuation', filter);
    return this.withCache(key, async () => {
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.stockQuantRepo
        .createQueryBuilder('sq')
        .innerJoin('sq.product', 'p')
        .innerJoin('sq.warehouse', 'w')
        .where('p.isEnabled = true')
        .andWhere('sq.quantity > 0');

      if (filter.warehouseId)
        qb.andWhere('sq.warehouseId = :wh', { wh: filter.warehouseId });
      if (filter.categoryId)
        qb.andWhere('p.categoryId = :cat', { cat: filter.categoryId });

      const allRaw = await qb
        .select('p.id', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('w.name', 'warehouseName')
        .addSelect('SUM(sq.quantity)', 'totalQty')
        .addSelect('p.cost', 'cost')
        .addSelect('p.price', 'price')
        .groupBy('p.id')
        .addGroupBy('p.name')
        .addGroupBy('p.code')
        .addGroupBy('p.cost')
        .addGroupBy('p.price')
        .addGroupBy('w.name')
        .orderBy('SUM(sq.quantity) * p.cost', 'DESC')
        .getRawMany<{
          productId: number;
          productName: string;
          productCode: string;
          warehouseName: string;
          totalQty: string;
          cost: string;
          price: string;
        }>();

      const total = allRaw.length;
      const rows = allRaw
        .slice((page - 1) * perPage, page * perPage)
        .map((r) => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.productCode,
          warehouseName: r.warehouseName,
          quantity: Number(r.totalQty),
          cost: Number(r.cost),
          price: Number(r.price),
          totalValue: Number(r.totalQty) * Number(r.cost),
          valuationSale: Number(r.totalQty) * Number(r.price),
        }));

      const totalValuation = allRaw.reduce(
        (s, r) => s + Number(r.totalQty) * Number(r.cost),
        0,
      );

      return {
        kpis: {
          totalValuation,
          productCount: total,
          totalQuantity: allRaw.reduce((s, r) => s + Number(r.totalQty), 0),
        },
        chart: null,
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  /** Low stock — products where available quantity <= stockAlertThreshold */
  async getLowStock(filter: StockReportFilterDto) {
    const key = this.cacheKey('low-stock', filter);
    return this.withCache(key, async () => {
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.stockQuantRepo
        .createQueryBuilder('sq')
        .innerJoin('sq.product', 'p')
        .innerJoin('sq.warehouse', 'w')
        .where('p.isEnabled = true')
        .andWhere('p.isService = false')
        .andWhere('sq.availableQuantity <= COALESCE(p.stockAlertThreshold, 5)');

      if (filter.warehouseId)
        qb.andWhere('sq.warehouseId = :wh', { wh: filter.warehouseId });
      if (filter.categoryId)
        qb.andWhere('p.categoryId = :cat', { cat: filter.categoryId });

      const allRaw = await qb
        .select('p.id', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('w.id', 'warehouseId')
        .addSelect('w.name', 'warehouseName')
        .addSelect('sq.quantity', 'quantity')
        .addSelect('sq.availableQuantity', 'availableQuantity')
        .addSelect('sq.reservedQuantity', 'reservedQuantity')
        .addSelect('p.stockAlertThreshold', 'threshold')
        .orderBy('sq.availableQuantity', 'ASC')
        .getRawMany<{
          productId: number;
          productName: string;
          productCode: string;
          warehouseId: number;
          warehouseName: string;
          quantity: string;
          availableQuantity: string;
          reservedQuantity: string;
          threshold: string;
        }>();

      const total = allRaw.length;
      const rows = allRaw
        .slice((page - 1) * perPage, page * perPage)
        .map((r) => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.productCode,
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          quantity: Number(r.quantity),
          availableQuantity: Number(r.availableQuantity),
          reservedQuantity: Number(r.reservedQuantity),
          threshold: Number(r.threshold ?? 5),
          urgency: Number(r.availableQuantity) <= 0 ? 'rupture' : 'alerte',
        }));

      return {
        kpis: {
          lowStockCount: total,
          outOfStockCount: allRaw.filter(
            (r) => Number(r.availableQuantity) <= 0,
          ).length,
          alertCount: allRaw.filter((r) => Number(r.availableQuantity) > 0)
            .length,
        },
        chart: null,
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  /** Stock movements journal — paginated list */
  async getMovementsJournal(filter: StockReportFilterDto) {
    const key = this.cacheKey('movements', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.stockMovementRepo
        .createQueryBuilder('sm')
        .innerJoin('sm.product', 'p')
        .leftJoin('sm.sourceWarehouse', 'sw')
        .leftJoin('sm.destWarehouse', 'dw')
        .where('sm.dateDone >= :from AND sm.dateDone <= :to', { from, to })
        .andWhere('sm.status = :status', { status: MovementStatus.DONE });

      if (filter.warehouseId) {
        qb.andWhere(
          '(sm.sourceWarehouseId = :wh OR sm.destWarehouseId = :wh)',
          { wh: filter.warehouseId },
        );
      }

      const [rawRows, total] = await qb
        .select([
          'sm.id',
          'sm.reference',
          'sm.movementType',
          'sm.quantity',
          'sm.dateDone',
          'sm.origin',
          'sm.productId',
          'sm.sourceWarehouseId',
          'sm.destWarehouseId',
        ])
        .orderBy('sm.dateDone', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      // Load product/warehouse names separately
      const productIds = [...new Set(rawRows.map((m) => m.productId))];
      const whIds = [
        ...new Set(
          [
            ...rawRows.map((m) => m.sourceWarehouseId),
            ...rawRows.map((m) => m.destWarehouseId),
          ].filter(Boolean),
        ),
      ] as number[];

      const products =
        productIds.length > 0
          ? await this.productRepo.findByIds(productIds)
          : [];
      const warehouses =
        whIds.length > 0 ? await this.warehouseRepo.findByIds(whIds) : [];

      const productMap = new Map(products.map((p) => [p.id, p]));
      const whMap = new Map(warehouses.map((w) => [w.id, w]));

      return {
        kpis: { totalMovements: total },
        chart: null,
        rows: rawRows.map((sm) => ({
          id: sm.id,
          reference: sm.reference,
          movementType: sm.movementType,
          productName: productMap.get(sm.productId)?.name ?? '-',
          productCode: productMap.get(sm.productId)?.code ?? '-',
          quantity: sm.quantity,
          date: sm.dateDone,
          origin: sm.origin,
          sourceWarehouse: sm.sourceWarehouseId
            ? (whMap.get(sm.sourceWarehouseId)?.name ?? '-')
            : '-',
          destWarehouse: sm.destWarehouseId
            ? (whMap.get(sm.destWarehouseId)?.name ?? '-')
            : '-',
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Slow / dead stock — products with no movement in the given period */
  async getSlowDeadStock(filter: StockReportFilterDto) {
    const key = this.cacheKey('slow-dead', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      // Products that DID have movements in the period
      const activeProductIds = await this.stockMovementRepo
        .createQueryBuilder('sm')
        .where('sm.dateDone >= :from AND sm.dateDone <= :to', { from, to })
        .andWhere('sm.status = :status', { status: MovementStatus.DONE })
        .select('DISTINCT sm.productId', 'productId')
        .getRawMany<{ productId: number }>();

      const activeSet = new Set(activeProductIds.map((r) => r.productId));

      const allStock = await this.stockQuantRepo
        .createQueryBuilder('sq')
        .innerJoin('sq.product', 'p')
        .where('p.isEnabled = true')
        .andWhere('p.isService = false')
        .andWhere('sq.quantity > 0')
        .select('p.id', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('p.cost', 'cost')
        .addSelect('SUM(sq.quantity)', 'quantity')
        .groupBy('p.id')
        .addGroupBy('p.name')
        .addGroupBy('p.code')
        .addGroupBy('p.cost')
        .getRawMany<{
          productId: number;
          productName: string;
          productCode: string;
          cost: string;
          quantity: string;
        }>();

      const deadStock = allStock.filter((r) => !activeSet.has(r.productId));

      const total = deadStock.length;
      const rows = deadStock
        .slice((page - 1) * perPage, page * perPage)
        .map((r) => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.productCode,
          quantity: Number(r.quantity),
          immobilisedValue: Number(r.quantity) * Number(r.cost),
        }));

      return {
        kpis: {
          deadStockCount: total,
          immobilisedValue: deadStock.reduce(
            (s, r) => s + Number(r.quantity) * Number(r.cost),
            0,
          ),
        },
        chart: null,
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  /** Stock by warehouse */
  async getStockByWarehouse(filter: StockReportFilterDto) {
    const key = this.cacheKey('by-warehouse', filter);
    return this.withCache(key, async () => {
      const qb = this.stockQuantRepo
        .createQueryBuilder('sq')
        .innerJoin('sq.warehouse', 'w')
        .where('sq.quantity > 0');

      if (filter.warehouseId)
        qb.andWhere('sq.warehouseId = :wh', { wh: filter.warehouseId });

      const raw = await qb
        .select('w.id', 'warehouseId')
        .addSelect('w.name', 'warehouseName')
        .addSelect('COUNT(DISTINCT sq.productId)', 'productCount')
        .addSelect('SUM(sq.quantity)', 'totalQty')
        .addSelect('SUM(sq.availableQuantity)', 'availableQty')
        .addSelect('SUM(sq.reservedQuantity)', 'reservedQty')
        .groupBy('w.id')
        .addGroupBy('w.name')
        .orderBy('SUM(sq.quantity)', 'DESC')
        .getRawMany<{
          warehouseId: number;
          warehouseName: string;
          productCount: string;
          totalQty: string;
          availableQty: string;
          reservedQty: string;
        }>();

      return {
        kpis: {
          totalWarehouses: raw.length,
          totalQuantity: raw.reduce((s, r) => s + Number(r.totalQty), 0),
        },
        chart: {
          type: 'bar',
          labels: raw.map((r) => r.warehouseName),
          series: [
            { name: 'Stock total', data: raw.map((r) => Number(r.totalQty)) },
          ],
        },
        rows: raw.map((r) => ({
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          skuCount: Number(r.productCount),
          totalQty: Number(r.totalQty),
          availableQty: Number(r.availableQty),
          reservedQty: Number(r.reservedQty),
        })),
        meta: null,
      };
    });
  }

  async getStockValuationXlsx(filter: StockReportFilterDto): Promise<Buffer> {
    const data = await this.getStockValuation({
      ...filter,
      page: 1,
      perPage: 10_000,
    });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      data.rows.map((r) => ({
        Code: r.sku,
        Produit: r.productName,
        Dépôt: r.warehouseName,
        Quantité: r.quantity,
        'Coût unitaire (MAD)': r.cost,
        'Valeur stock (MAD)': r.totalValue,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Valorisation Stock');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
