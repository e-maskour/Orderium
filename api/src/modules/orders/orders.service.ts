import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Repository, DataSource, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as XLSX from 'xlsx';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderOriginType,
  DeliveryStatus,
} from './entities/order.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import {
  DeliveryPerson,
  OrderDelivery,
} from '../delivery/entities/delivery.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { OrderNotificationService } from '../notifications/order-notification.service';
import { PDFService } from '../pdf/pdf.service';
import { PdfQueueService } from '../pdf/pdf.queue.service';
import { StockService } from '../inventory/stock.service';
import {
  MovementType,
  SourceDocumentType,
} from '../inventory/entities/stock-movement.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  formatOrderDetail,
  formatOrderListItem,
  applyDeliveryStatusTimestamp,
  buildDeliveryStatusCounts,
  buildOrderStatusCounts,
  buildOrderExportRows,
  ORDER_XLSX_COL_WIDTHS,
} from './orders.helpers';
import {
  ORDER_LIST_FIELDS,
  CUSTOMER_SUMMARY_FIELDS,
  SUPPLIER_SUMMARY_FIELDS,
  ORDER_ITEM_FIELDS,
  PRODUCT_SUMMARY_FIELDS,
  applyOrderFilters,
} from './orders.queries';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly partnersService: PartnersService,
    private readonly configService: ConfigService,
    private readonly configurationsService: ConfigurationsService,
    private readonly sequencesService: SequencesService,
    @Inject(forwardRef(() => OrderNotificationService))
    private readonly orderNotificationService: OrderNotificationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly pdfQueueService: PdfQueueService,
    private readonly stockService: StockService,
  ) {}

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private get orderItemRepository(): Repository<OrderItem> {
    return this.tenantConnService.getRepository(OrderItem);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  // ── Provisional number helper ──────────────────────────────────────────────

  private async getNextProvNumber(): Promise<string> {
    const last = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.documentNumber')
      .where('order.documentNumber LIKE :pattern', { pattern: 'PROV%' })
      .orderBy('order.id', 'DESC')
      .limit(1)
      .getOne();
    const match = last?.documentNumber.match(/PROV(\d+)/);
    return `PROV${match ? parseInt(match[1]) + 1 : 1}`;
  }

  // ── Field update helper (DRY for update / updateValidated) ────────────────

  private applyOrderFieldUpdates(
    order: Order,
    dto: Partial<CreateOrderDto>,
  ): void {
    const textFields = [
      'notes',
      'customerName',
      'customerPhone',
      'customerAddress',
      'supplierName',
      'supplierPhone',
      'supplierAddress',
    ] as const;
    for (const f of textFields) {
      if ((dto as any)[f] !== undefined) (order as any)[f] = (dto as any)[f];
    }
    const numFields = [
      'total',
      'subtotal',
      'tax',
      'discount',
      'discountType',
      'customerId',
      'supplierId',
    ] as const;
    for (const f of numFields) {
      if ((dto as any)[f] !== undefined) (order as any)[f] = (dto as any)[f];
    }
    if (dto.date !== undefined) order.date = new Date(dto.date);
    if (dto.dueDate !== undefined) {
      order.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    const finalSupplierId =
      dto.supplierId !== undefined ? dto.supplierId : order.supplierId;
    order.direction = finalSupplierId
      ? DocumentDirection.ACHAT
      : DocumentDirection.VENTE;
  }

  private async replaceOrderItems(
    manager: any,
    orderId: number,
    items: CreateOrderDto['items'] | undefined,
  ): Promise<void> {
    if (!items?.length) return;
    await manager.delete(OrderItem, { orderId });
    await manager.insert(
      OrderItem,
      items.map((item) => ({
        orderId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        discount: item.discount || 0,
        discountType: item.discountType || 0,
        tax: item.tax || 0,
        total: item.total ?? 0,
      })),
    );
  }

  private async invalidateOrderCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`order:${id}`);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createOrder(
    createOrderDto: CreateOrderDto,
  ): Promise<Record<string, unknown>> {
    if (!createOrderDto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerPhone) {
        const partner = await this.partnersService.findByPhone(
          createOrderDto.customerPhone,
        );
        customerId = partner?.id;
      }

      if (customerId) {
        const customer = await manager
          .getRepository('partners')
          .findOne({ where: { id: customerId } });
        if (!customer) {
          throw new BadRequestException(
            `Customer with ID ${customerId} does not exist`,
          );
        }
        if (!createOrderDto.customerName)
          createOrderDto.customerName = customer.name;
        if (!createOrderDto.customerPhone)
          createOrderDto.customerPhone = customer.phoneNumber;
        if (!createOrderDto.customerAddress)
          createOrderDto.customerAddress =
            customer.address || customer.deliveryAddress;
      }

      const originType =
        createOrderDto.originType ?? OrderOriginType.BACKOFFICE;
      const isPortalOrigin =
        originType === OrderOriginType.CLIENT_POS ||
        originType === OrderOriginType.ADMIN_POS;

      let documentNumber: string;
      let orderNumber: string | null = null;
      let receiptNumber: string | null = null;

      if (isPortalOrigin) {
        // POS orders: CMD sequence → orderNumber (and documentNumber for backward compat)
        const orderDate = createOrderDto.date
          ? new Date(createOrderDto.date)
          : now;
        orderNumber = await this.sequencesService.generateNext('order', {
          date: orderDate,
        });
        documentNumber = orderNumber; // keep documentNumber populated for backward compat
        receiptNumber = await this.sequencesService.generateNext('receipt', {
          date: orderDate,
        });
      } else {
        documentNumber = await this.getNextProvNumber();
      }

      const order = new Order();
      order.documentNumber = documentNumber;
      order.orderNumber = orderNumber;
      order.receiptNumber = receiptNumber;
      order.customerId = customerId ?? null;
      order.supplierId = createOrderDto.supplierId ?? null;
      order.supplierName = createOrderDto.supplierName ?? '';
      order.supplierPhone = createOrderDto.supplierPhone ?? '';
      order.supplierAddress = createOrderDto.supplierAddress ?? '';
      order.direction = createOrderDto.supplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE;
      order.customerName = createOrderDto.customerName ?? '';
      order.customerPhone = createOrderDto.customerPhone ?? '';
      order.customerAddress = createOrderDto.customerAddress ?? '';
      order.date = today;
      order.dueDate = createOrderDto.dueDate
        ? new Date(createOrderDto.dueDate)
        : null;
      order.subtotal = createOrderDto.subtotal || 0;
      order.tax = createOrderDto.tax || 0;
      order.total = createOrderDto.total || 0;
      order.notes = createOrderDto.note ?? '';
      order.discount = createOrderDto.discount || 0;
      order.discountType = createOrderDto.discountType || 0;
      order.originType = originType;
      order.deliveryStatus = (createOrderDto.deliveryStatus as any) ?? null;

      if (order.deliveryStatus) {
        applyDeliveryStatusTimestamp(order, order.deliveryStatus, now);
      }

      if (originType === OrderOriginType.ADMIN_POS) {
        order.status = OrderStatus.DELIVERED;
        order.isValidated = true;
      } else if (originType === OrderOriginType.CLIENT_POS) {
        order.status = OrderStatus.CONFIRMED;
        order.isValidated = true;
      } else {
        order.status = OrderStatus.DRAFT;
        order.isValidated = false;
      }

      const savedOrder = await manager.save(Order, order);

      // Batch-validate product IDs
      const productIds = createOrderDto.items
        .map((i) => i.productId)
        .filter((id): id is number => id != null);
      let validIds = new Set<number>();
      if (productIds.length) {
        const existing = await manager.find(Product, {
          where: { id: In(productIds) },
          select: ['id'],
        });
        validIds = new Set(existing.map((p) => p.id));
      }

      const orderItems = createOrderDto.items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId:
            item.productId != null && validIds.has(item.productId)
              ? item.productId
              : null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax || 0,
          total: item.total ?? 0,
        }),
      );
      await manager.save(OrderItem, orderItems);

      const createdOrder = await manager
        .createQueryBuilder(Order, 'order')
        .leftJoin('order.customer', 'customer')
        .leftJoin('order.supplier', 'supplier')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoin('items.product', 'product')
        .select([
          ...ORDER_LIST_FIELDS,
          ...CUSTOMER_SUMMARY_FIELDS,
          ...SUPPLIER_SUMMARY_FIELDS,
          ...ORDER_ITEM_FIELDS,
          ...PRODUCT_SUMMARY_FIELDS,
        ])
        .where('order.id = :id', { id: savedOrder.id })
        .getOne();

      if (!createdOrder) {
        throw new NotFoundException(`Order #${savedOrder.id} not found`);
      }

      return formatOrderDetail(createdOrder);
    });

    const isPortalOriginFinal =
      createOrderDto.originType === OrderOriginType.CLIENT_POS ||
      createOrderDto.originType === OrderOriginType.ADMIN_POS;

    if (isPortalOriginFinal && result) {
      const orderId = (result as any).id as number;

      // Process stock for auto-validated portal orders (same logic as validate())
      void this.processOrderStockIfConfigured(orderId);

      if (createOrderDto.originType === OrderOriginType.CLIENT_POS) {
        const fullOrder = await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['customer'],
        });
        if (fullOrder) {
          this.orderNotificationService
            .notifyNewOrderFromClient(fullOrder)
            .catch((err) => {
              this.logger.error(
                'Failed to send new order notification',
                (err as Error)?.stack,
              );
            });
        }
      }
    }

    return result as unknown as Record<string, unknown>;
  }

  async getAllOrders(
    limit = 100,
    originType?: string | string[],
    deliveryStatus?: string,
    startDate?: Date,
    endDate?: Date,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{ orders: any[]; count: number; statusCounts: any }> {
    const qb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([...ORDER_LIST_FIELDS, ...CUSTOMER_SUMMARY_FIELDS])
      .orderBy('order.dateCreated', 'DESC')
      .take(limit);

    applyOrderFilters(qb, { originType, deliveryStatus, direction });
    if (startDate && endDate) {
      qb.andWhere('order.dateCreated >= :startDate', { startDate });
      qb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const orders = await qb.getMany();

    // GROUP BY avoids loading all rows into JS just to count statuses
    const countQb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .select('order.deliveryStatus', 'deliveryStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.deliveryStatus');

    applyOrderFilters(countQb, { originType, direction });
    if (startDate && endDate) {
      countQb.andWhere('order.dateCreated >= :startDate', { startDate });
      countQb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const countRows = await countQb.getRawMany<{
      deliveryStatus: string | null;
      count: string;
    }>();
    const totalAll = countRows.reduce((s, r) => s + parseInt(r.count, 10), 0);

    return {
      orders: orders.map(formatOrderListItem),
      count: orders.length,
      statusCounts: buildDeliveryStatusCounts(countRows, totalAll),
    };
  }

  async filterOrders(
    startDate?: Date,
    endDate?: Date,
    deliveryStatus?: string[],
    orderNumber?: string,
    customerId?: number,
    deliveryPersonId?: number,
    originType?: string | string[],
    page = 1,
    pageSize = 50,
    supplierId?: number,
    direction?: 'ACHAT' | 'VENTE',
    status?: string[],
    search?: string,
  ): Promise<{
    orders: any[];
    count: number;
    totalCount: number;
    statusCounts: any;
    orderStatusCounts: any;
  }> {
    const filters = {
      originType,
      deliveryStatus,
      status,
      search,
      orderNumber,
      customerId,
      supplierId,
      deliveryPersonId,
      direction,
      startDate,
      endDate,
    };

    // Paginated main query
    const qb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('order.supplier', 'supplier')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
      .select([
        ...ORDER_LIST_FIELDS,
        ...CUSTOMER_SUMMARY_FIELDS,
        ...SUPPLIER_SUMMARY_FIELDS,
      ])
      .orderBy('order.dateCreated', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    applyOrderFilters(qb, filters);
    if (startDate && endDate) {
      qb.andWhere('order.dateCreated >= :startDate', { startDate });
      qb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const orders = await qb.getMany();

    // Delivery status counts via GROUP BY
    const dsCountQb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
      .select('order.deliveryStatus', 'deliveryStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.deliveryStatus');

    applyOrderFilters(dsCountQb, filters);
    if (startDate && endDate) {
      dsCountQb.andWhere('order.dateCreated >= :startDate', { startDate });
      dsCountQb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const dsRows = await dsCountQb.getRawMany<{
      deliveryStatus: string | null;
      count: string;
    }>();
    const totalAll = dsRows.reduce((s, r) => s + parseInt(r.count, 10), 0);

    // Order status counts via GROUP BY
    const osCountQb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status');

    applyOrderFilters(osCountQb, filters);
    if (startDate && endDate) {
      osCountQb.andWhere('order.dateCreated >= :startDate', { startDate });
      osCountQb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const osRows = await osCountQb.getRawMany<{
      status: string | null;
      count: string;
    }>();

    return {
      orders: orders.map(formatOrderListItem),
      count: orders.length,
      totalCount: totalAll,
      statusCounts: buildDeliveryStatusCounts(dsRows, totalAll),
      orderStatusCounts: buildOrderStatusCounts(osRows, totalAll),
    };
  }

  async getOrderAggregates(
    startDate?: Date,
    endDate?: Date,
    deliveryStatus?: string[],
    orderNumber?: string,
    customerId?: number,
    deliveryPersonId?: number,
    originType?: string | string[],
    supplierId?: number,
    direction?: 'ACHAT' | 'VENTE',
    status?: string[],
    search?: string,
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  }> {
    const filters = {
      originType,
      deliveryStatus,
      status,
      search,
      orderNumber,
      customerId,
      supplierId,
      deliveryPersonId,
      direction,
      startDate,
      endDate,
    };

    const aggQb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
      .select('COALESCE(SUM(order.total), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(order.paidAmount), 0)', 'totalPaid')
      .addSelect('COALESCE(SUM(order.remainingAmount), 0)', 'totalRemaining');

    applyOrderFilters(aggQb, filters);
    if (startDate && endDate) {
      aggQb.andWhere('order.dateCreated >= :startDate', { startDate });
      aggQb.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const aggResult = await aggQb.getRawOne<{
      totalAmount: string;
      totalPaid: string;
      totalRemaining: string;
    }>();

    return {
      totalAmount: parseFloat(aggResult?.totalAmount || '0'),
      totalPaid: parseFloat(aggResult?.totalPaid || '0'),
      totalRemaining: parseFloat(aggResult?.totalRemaining || '0'),
    };
  }

  async getOrderById(id: number): Promise<Record<string, unknown>> {
    const cacheKey = `order:${id}`;
    const cached =
      await this.cacheManager.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const order = await this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('order.supplier', 'supplier')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoin('items.product', 'product')
      .select([
        ...ORDER_LIST_FIELDS,
        ...CUSTOMER_SUMMARY_FIELDS,
        ...SUPPLIER_SUMMARY_FIELDS,
        ...ORDER_ITEM_FIELDS,
        ...PRODUCT_SUMMARY_FIELDS,
      ])
      .where('order.id = :id', { id })
      .getOne();

    if (!order) throw new NotFoundException(`Order #${id} not found`);

    const orderDelivery = await this.tenantConnService
      .getRepository(OrderDelivery)
      .findOne({ where: { orderId: id }, relations: ['deliveryPerson'] });
    const deliveryPerson: DeliveryPerson | null =
      orderDelivery?.deliveryPerson ?? null;

    const result = formatOrderDetail(
      order,
      deliveryPerson,
    ) as unknown as Record<string, unknown>;
    await this.cacheManager.set(cacheKey, result, 300_000);
    return result;
  }

  async getOrderByNumber(
    orderNumber: string,
  ): Promise<Record<string, unknown> | null> {
    const order = await this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('order.supplier', 'supplier')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoin('items.product', 'product')
      .select([
        ...ORDER_LIST_FIELDS,
        ...CUSTOMER_SUMMARY_FIELDS,
        ...SUPPLIER_SUMMARY_FIELDS,
        ...ORDER_ITEM_FIELDS,
        ...PRODUCT_SUMMARY_FIELDS,
      ])
      .where('order.documentNumber = :orderNumber', { orderNumber })
      .getOne();

    return order
      ? (formatOrderDetail(order) as unknown as Record<string, unknown>)
      : null;
  }

  async getCustomerOrders(
    customerId: number,
    page = 1,
    pageSize = 10,
    orderNumber?: string,
    deliveryStatus?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    orders: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let qb = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([...ORDER_LIST_FIELDS, ...CUSTOMER_SUMMARY_FIELDS])
      .where('order.customerId = :customerId', { customerId });

    if (orderNumber?.trim()) {
      qb = qb.andWhere('order.documentNumber LIKE :orderNumber', {
        orderNumber: `%${orderNumber}%`,
      });
    }
    if (deliveryStatus && deliveryStatus !== 'all') {
      qb = qb.andWhere('order.deliveryStatus = :deliveryStatus', {
        deliveryStatus,
      });
    }
    if (startDate)
      qb = qb.andWhere('order.dateCreated >= :startDate', { startDate });
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      qb = qb.andWhere('order.dateCreated <= :endDate', { endDate: endOfDay });
    }

    const [orders, total] = await qb
      .orderBy('order.dateCreated', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      orders: orders.map(formatOrderListItem),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ── Validate / Devalidate ─────────────────────────────────────────────────

  async validate(id: number): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.isValidated)
      throw new BadRequestException('Order is already validated');

    if (order.documentNumber.startsWith('PROV')) {
      const seqType = order.supplierId ? 'purchase_order' : 'delivery_note';
      const finalNumber = await this.sequencesService.generateNext(seqType, {
        date: order.date ? new Date(order.date) : new Date(),
      });
      await this.orderRepository.update(id, {
        documentNumber: finalNumber,
        isValidated: true,
        validationDate: new Date(),
        status: OrderStatus.IN_PROGRESS,
      });
    } else {
      await this.orderRepository.update(id, {
        isValidated: true,
        validationDate: new Date(),
        status: OrderStatus.IN_PROGRESS,
      });
    }

    await this.invalidateOrderCache(id);
    void this.pdfQueueService.enqueue('delivery-note', id);

    // ── Config-driven stock movement ───────────────────────────────────────
    await this.processOrderStockIfConfigured(id);

    return await this.getOrderById(id);
  }

  /**
   * Read inventory configuration and, when applicable, trigger stock movements
   * or update pending (forecast) quantities for the given order.
   *
   * - decrementStockOnOrderVente / incrementStockOnOrderAchat = true
   *   → physical movement happens immediately (quantity changes now).
   * - decrementStockOnInvoiceVente / incrementStockOnInvoiceAchat = true
   *   → only forecast quantities are set (outgoing/incoming/reserved);
   *     the physical movement will occur when the related invoice is validated.
   *
   * Failures are non-fatal and only logged.
   */
  private async processOrderStockIfConfigured(orderId: number): Promise<void> {
    try {
      const [invConfig, orderWithItems] = await Promise.all([
        this.configurationsService.findByEntity('inventory'),
        this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['items'],
        }),
      ]);

      if (!orderWithItems) return;

      const invValues = invConfig?.values as Record<string, unknown> | null;
      const defaultWarehouseId = invValues?.defaultWarehouseId as number | null;

      if (!defaultWarehouseId) return;

      const isVente = orderWithItems.direction === DocumentDirection.VENTE;
      const isAchat = orderWithItems.direction === DocumentDirection.ACHAT;

      const items = (orderWithItems.items ?? [])
        .filter(
          (i): i is typeof i & { productId: number } =>
            !!i.productId && i.quantity > 0,
        )
        .map((i) => ({ productId: i.productId, quantity: i.quantity }));

      if (items.length === 0) return;

      // ── Physical movement (stock moves at order validation time) ──────────
      const shouldMovePhysical =
        (isVente && invValues?.decrementStockOnOrderVente) ||
        (isAchat && invValues?.incrementStockOnOrderAchat);

      if (shouldMovePhysical) {
        const movementType = isAchat
          ? MovementType.RECEIPT
          : MovementType.DELIVERY;

        const partnerName = isAchat
          ? orderWithItems.supplierName
          : orderWithItems.customerName;

        await this.stockService.processDocumentStockMovements({
          sourceDocumentType: SourceDocumentType.ORDER,
          sourceDocumentId: orderId,
          items,
          warehouseId: defaultWarehouseId,
          movementType,
          origin: orderWithItems.documentNumber,
          partnerName: partnerName ?? undefined,
        });

        // Physical movement already handles all quantity fields — done.
        return;
      }

      // ── Forecast quantities (stock moves at invoice validation time) ───────
      // Set outgoing/incoming/reserved so the product detail stock table shows
      // the committed quantities before the invoice is created.
      if (isVente && invValues?.decrementStockOnInvoiceVente) {
        await this.stockService.updatePendingQuantitiesForDocument({
          items,
          warehouseId: defaultWarehouseId,
          type: 'outgoing',
          delta: 1,
        });
      } else if (isAchat && invValues?.incrementStockOnInvoiceAchat) {
        await this.stockService.updatePendingQuantitiesForDocument({
          items,
          warehouseId: defaultWarehouseId,
          type: 'incoming',
          delta: 1,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to process stock for order #${orderId}: ${(err as Error)?.message}`,
      );
    }
  }

  /**
   * Clear pending (forecast) quantities that were set when the order was
   * validated in "invoice trigger" mode.  Called on devalidate.
   */
  private async clearOrderPendingQuantitiesIfConfigured(
    orderId: number,
    order: Order,
  ): Promise<void> {
    try {
      const invConfig =
        await this.configurationsService.findByEntity('inventory');
      const invValues = invConfig?.values as Record<string, unknown> | null;
      const defaultWarehouseId = invValues?.defaultWarehouseId as number | null;

      if (!defaultWarehouseId) return;

      const isVente = order.direction === DocumentDirection.VENTE;
      const isAchat = order.direction === DocumentDirection.ACHAT;

      const shouldClearPending =
        (isVente && invValues?.decrementStockOnInvoiceVente) ||
        (isAchat && invValues?.incrementStockOnInvoiceAchat);

      if (!shouldClearPending) return;

      const orderWithItems = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!orderWithItems) return;

      const items = (orderWithItems.items ?? [])
        .filter(
          (i): i is typeof i & { productId: number } =>
            !!i.productId && i.quantity > 0,
        )
        .map((i) => ({ productId: i.productId, quantity: i.quantity }));

      if (items.length === 0) return;

      await this.stockService.updatePendingQuantitiesForDocument({
        items,
        warehouseId: defaultWarehouseId,
        type: isVente ? 'outgoing' : 'incoming',
        delta: -1,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to clear pending stock for order #${orderId}: ${(err as Error)?.message}`,
      );
    }
  }

  async devalidate(id: number): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.isValidated)
      throw new BadRequestException('Order is not validated');

    // Roll back the sequence counter if this was the last issued number in the period.
    if (!order.documentNumber.startsWith('PROV')) {
      const seqTypeForRelease = order.supplierId
        ? 'purchase_order'
        : 'delivery_note';
      await this.sequencesService.releaseNumber(
        seqTypeForRelease,
        order.documentNumber,
      );
    }

    let nextProvNumber: string;
    if (order.documentNumber.startsWith('PROV')) {
      nextProvNumber = order.documentNumber;
    } else {
      const allProv = await this.orderRepository
        .createQueryBuilder('order')
        .select('order.documentNumber')
        .where('order.documentNumber LIKE :pattern', { pattern: 'PROV%' })
        .andWhere('order.id != :currentId', { currentId: id })
        .getMany();

      let max = 0;
      for (const p of allProv) {
        const m = p.documentNumber.match(/PROV(\d+)/);
        if (m && parseInt(m[1]) > max) max = parseInt(m[1]);
      }
      nextProvNumber = `PROV${max + 1}`;
    }

    await this.pdfService.deletePDF(order.pdfUrl);
    await this.orderRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: OrderStatus.DRAFT,
      pdfUrl: null,
    });

    // Reverse physical stock movements (if stock was moved at order validation time)
    // and clear any pending forecast quantities (if stock is tracked at invoice time).
    try {
      await this.stockService.reverseDocumentStockMovements(
        SourceDocumentType.ORDER,
        id,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to reverse stock for devalidated order #${id}: ${(err as Error)?.message}`,
      );
    }

    await this.clearOrderPendingQuantitiesIfConfigured(id, order);

    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateOrder(
    id: number,
    updateOrderDto: Partial<CreateOrderDto>,
  ): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.isValidated) {
      throw new BadRequestException(
        'Cannot update a validated order. Devalidate first.',
      );
    }
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update a delivered or cancelled order.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      this.applyOrderFieldUpdates(order, updateOrderDto);

      if (updateOrderDto.deliveryStatus !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (updateOrderDto.deliveryStatus === 'canceled') {
          const allowed = [
            DeliveryStatus.PENDING,
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.CONFIRMED,
          ];
          if (order.deliveryStatus && !allowed.includes(order.deliveryStatus)) {
            throw new BadRequestException(
              `Cannot cancel delivery in status '${order.deliveryStatus}'.`,
            );
          }
        }
        order.deliveryStatus = updateOrderDto.deliveryStatus as any;
        applyDeliveryStatusTimestamp(
          order,
          updateOrderDto.deliveryStatus,
          new Date(),
        );
      }

      await manager.save(Order, order);
      await this.replaceOrderItems(manager, id, updateOrderDto.items);
      await this.invalidateOrderCache(id);
      return await this.getOrderById(id);
    });
  }

  async updateValidatedOrder(
    id: number,
    updateOrderDto: Partial<CreateOrderDto>,
  ): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update a delivered or cancelled order.',
      );
    }

    const wasValidated = order.isValidated;

    const result = await this.dataSource.transaction(async (manager) => {
      this.applyOrderFieldUpdates(order, updateOrderDto);
      await manager.save(Order, order);
      await this.replaceOrderItems(manager, id, updateOrderDto.items);
      await this.invalidateOrderCache(id);
      return await this.getOrderById(id);
    });

    if (wasValidated) void this.pdfQueueService.enqueue('delivery-note', id);
    return result;
  }

  // ── Status transitions ────────────────────────────────────────────────────

  async deliver(id: number): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.isValidated)
      throw new BadRequestException('Order must be validated before delivery');
    if (
      order.status !== OrderStatus.IN_PROGRESS &&
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PICKED_UP
    ) {
      throw new BadRequestException(
        'Order must be confirmed or picked up to be delivered',
      );
    }
    await this.orderRepository.update(id, { status: OrderStatus.DELIVERED });
    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async cancel(id: number): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.DELIVERED)
      throw new BadRequestException('Cannot cancel a delivered order');
    await this.orderRepository.update(id, {
      status: OrderStatus.CANCELLED,
      isValidated: false,
    });

    // Reverse any stock movements that were applied when the order was confirmed
    try {
      await this.stockService.reverseDocumentStockMovements(
        SourceDocumentType.ORDER,
        id,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to reverse stock for cancelled order #${id}: ${(err as Error)?.message}`,
      );
    }

    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async markAsInvoiced(
    orderId: number,
    invoiceId: number,
  ): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    order.status = OrderStatus.INVOICED;
    order.convertedToInvoiceId = invoiceId;
    order.isValidated = true;
    await this.orderRepository.save(order);

    await this.invalidateOrderCache(orderId);
    return await this.getOrderById(orderId);
  }

  async changeOrderStatus(
    id: number,
    newStatus: string,
  ): Promise<Record<string, unknown>> {
    const WORKFLOW: Record<string, OrderStatus[]> = {
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PICKED_UP,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
    };

    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = WORKFLOW[order.status];
    if (allowed === undefined) {
      throw new BadRequestException(
        `No workflow for current status '${order.status}'`,
      );
    }
    if (!allowed.includes(newStatus as OrderStatus)) {
      throw new BadRequestException(
        `Cannot transition from '${order.status}' to '${newStatus}'`,
      );
    }

    order.status = newStatus as OrderStatus;
    await this.orderRepository.save(order);
    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async remove(id: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const isPosOrder =
      (order.originType as OrderOriginType) === OrderOriginType.CLIENT_POS ||
      (order.originType as OrderOriginType) === OrderOriginType.ADMIN_POS;

    if (!isPosOrder && order.isValidated) {
      throw new BadRequestException('ORDER_VALIDATED');
    }

    if (isPosOrder) {
      const paymentRows = await this.orderRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_payments WHERE "orderId" = $1`,
        [id],
      );
      if (parseInt(paymentRows[0]?.count || '0') > 0) {
        throw new ConflictException('ORDER_HAS_PAYMENTS');
      }
    }

    await this.orderItemRepository.delete({ orderId: id });
    await this.pdfService.deletePDF(order.pdfUrl);
    await this.orderRepository.delete(id);
    await this.invalidateOrderCache(id);
  }

  async bulkRemove(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const orders = await this.orderRepository.findBy({ id: In(ids) });

    if (orders.length !== ids.length) {
      const foundIds = orders.map((o) => o.id);
      const missing = ids.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Orders not found: ${missing.join(', ')}`);
    }

    for (const order of orders) {
      const isPosOrder =
        (order.originType as OrderOriginType) === OrderOriginType.CLIENT_POS ||
        (order.originType as OrderOriginType) === OrderOriginType.ADMIN_POS;

      if (!isPosOrder && order.isValidated) {
        const ref = order.documentNumber || `#${order.id}`;
        throw new BadRequestException(
          `Order ${ref} is validated and cannot be deleted`,
        );
      }
    }

    const posOrderIds = orders
      .filter(
        (o) =>
          (o.originType as OrderOriginType) === OrderOriginType.CLIENT_POS ||
          (o.originType as OrderOriginType) === OrderOriginType.ADMIN_POS,
      )
      .map((o) => o.id);

    if (posOrderIds.length > 0) {
      const paymentRows = await this.orderRepository.manager.query(
        `SELECT "orderId", COUNT(*) as count FROM order_payments WHERE "orderId" = ANY($1) GROUP BY "orderId"`,
        [posOrderIds],
      );
      if (paymentRows.length > 0) {
        const withPaymentIds: number[] = paymentRows.map((r: any) =>
          Number(r.orderId),
        );
        const refs = withPaymentIds.map((pid) => {
          const o = orders.find((ord) => ord.id === pid);
          return o?.orderNumber || `#${pid}`;
        });
        throw new ConflictException(
          `Orders ${refs.join(', ')} have payments and cannot be deleted`,
        );
      }
    }

    await this.orderItemRepository.delete({ orderId: In(ids) });
    await Promise.all(orders.map((o) => this.pdfService.deletePDF(o.pdfUrl)));
    await this.orderRepository.delete(ids);
    await Promise.all(ids.map((id) => this.invalidateOrderCache(id)));
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getOrderNumbers(
    search?: string,
    limit = 50,
  ): Promise<
    { id: number; documentNumber: string; customerId: number | null }[]
  > {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .addSelect('order.documentNumber', 'documentNumber')
      .addSelect('order.customerId', 'customerId')
      .orderBy('order.documentNumber', 'DESC')
      .take(limit);

    if (search) {
      qb.where('order.documentNumber LIKE :search', {
        search: `%${search}%`,
      });
    }

    return qb.getRawMany<{
      id: number;
      documentNumber: string;
      customerId: number | null;
    }>();
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .where('order.originType = :originType', {
        originType: OrderOriginType.BACKOFFICE,
      })
      .andWhere(
        'EXTRACT(YEAR FROM COALESCE(order.date, order.dateCreated)) = :year',
        { year },
      );

    if (direction === 'vente') {
      qb.andWhere('order.customerId IS NOT NULL');
    } else {
      qb.andWhere('order.supplierId IS NOT NULL');
    }

    const orders = await qb.getMany();

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthOrders = orders.filter(
        (o) => new Date(o.date || o.dateCreated).getMonth() === i,
      );
      return {
        month: i + 1,
        count: monthOrders.length,
        amount: monthOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      };
    });

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalOrders: orders.length,
        totalAmount: orders.reduce((s, o) => s + Number(o.total || 0), 0),
        deliveredCount: orders.filter((o) => o.status === OrderStatus.DELIVERED)
          .length,
        inProgressCount: orders.filter(
          (o) =>
            o.status === OrderStatus.IN_PROGRESS ||
            o.status === OrderStatus.VALIDATED,
        ).length,
        totalItems: orders.reduce((s, o) => s + (o.items?.length || 0), 0),
      },
    };
  }

  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.supplier', 'supplier')
      .orderBy('order.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        qb.where('order.supplierId = :supplierId', { supplierId });
      } else {
        qb.where('order.supplierId IS NULL');
      }
    }

    const orders = await qb.getMany();
    const exportData = orders.flatMap((order) => buildOrderExportRows(order));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = ORDER_XLSX_COL_WIDTHS;

    const sheetName =
      supplierId !== undefined
        ? supplierId
          ? "Bons d'achat"
          : 'Bons de livraison'
        : 'Bons';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ── Share link ────────────────────────────────────────────────────────────

  async generateShareLink(
    id: number,
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.isValidated || order.status === OrderStatus.DRAFT) {
      throw new BadRequestException('Only validated orders can be shared');
    }

    const shareToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.orderRepository.update(id, {
      shareToken,
      shareTokenExpiry: expiresAt,
    });
    await this.cacheManager.del(`order:${id}`);
    return { shareToken, expiresAt };
  }

  async getByShareToken(token: string): Promise<Record<string, unknown>> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.supplier', 'supplier')
      .where('order.shareToken = :token', { token })
      .getOne();

    if (!order) throw new NotFoundException('Order not found or link expired');
    if (
      order.shareTokenExpiry &&
      new Date() > new Date(order.shareTokenExpiry)
    ) {
      throw new BadRequestException('This order link has expired');
    }

    return {
      id: order.id,
      orderNumber: order.documentNumber,
      date: order.date,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      discountType: order.discountType,
      total: order.total,
      status: order.status,
      direction: order.direction,
      isValidated: order.isValidated,
      notes: order.notes,
      shareToken: order.shareToken,
      shareTokenExpiry: order.shareTokenExpiry,
      customerName: order.customerName ?? order.customer?.name,
      customerPhone: order.customerPhone ?? order.customer?.['phoneNumber'],
      customerAddress: order.customerAddress ?? order.customer?.address,
      supplierName: order.supplierName,
      supplierPhone: order.supplierPhone,
      supplierAddress: order.supplierAddress,
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax,
        total: item.total,
      })),
    };
  }

  async revokeShareLink(id: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.orderRepository.update(id, {
      shareToken: null,
      shareTokenExpiry: null,
    });
    await this.cacheManager.del(`order:${id}`);
  }
}
