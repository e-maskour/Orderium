import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  DeliveryStatus,
} from './entities/order.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { SequenceConfig } from '../../common/types/sequence-config.interface';
import { OrderNotificationService } from '../notifications/order-notification.service';
import { PDFService } from '../pdf/pdf.service';
import { StockService } from '../inventory/stock.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

// Removed composite response interface; service now returns `Order` directly.

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly partnersService: PartnersService,
    private readonly configService: ConfigService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(forwardRef(() => OrderNotificationService))
    private readonly orderNotificationService: OrderNotificationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly stockService: StockService,
  ) { }

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private get orderItemRepository(): Repository<OrderItem> {
    return this.tenantConnService.getRepository(OrderItem);
  }

  private get dataSource(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get customer ID
      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerPhone) {
        const partner = await this.partnersService.findByPhone(
          createOrderDto.customerPhone,
        );
        customerId = partner?.id;
      }

      // Validate that customer exists if customerId is provided
      if (customerId) {
        const customerExists = await manager.getRepository('partners').findOne({ where: { id: customerId } });
        if (!customerExists) {
          throw new BadRequestException(`Customer with ID ${customerId} does not exist`);
        }
      }

      // Generate provisional document number (PROV format for draft)
      let documentNumber: string;
      let receiptNumber: string | null = null;
      if (createOrderDto.fromPortal) {
        // Portal orders get immediate sequence number
        const sequence = await this.getOrCreateSequence(
          'delivery_note',
          createOrderDto.date,
        );
        documentNumber = this.generateSequenceNumber(
          sequence,
          createOrderDto.date,
        );

        // Portal orders also get receipt number
        const receiptSequence = await this.getOrCreateSequence(
          'receipt',
          createOrderDto.date,
        );
        receiptNumber = this.generateSequenceNumber(
          receiptSequence,
          createOrderDto.date,
        );
      } else {
        // Regular orders get PROV provisional number until validated
        const lastProvisional = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.documentNumber LIKE :pattern', { pattern: 'PROV%' })
          .orderBy('order.id', 'DESC')
          .limit(1)
          .getOne();

        let nextProvisionalNumber = 1;
        if (lastProvisional) {
          const match = lastProvisional.documentNumber.match(/PROV(\d+)/);
          if (match) {
            nextProvisionalNumber = parseInt(match[1]) + 1;
          }
        }
        documentNumber = `PROV${nextProvisionalNumber}`;
      }

      // Use values from frontend directly (no recalculation)
      const items = createOrderDto.items.map((item) => ({
        ...item,
        total: item.total || 0,
        tax: item.tax || 0,
      }));

      // Create order with values from frontend
      const order = new Order();
      order.documentNumber = documentNumber;
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
      order.fromPortal = createOrderDto.fromPortal ?? false;
      order.fromClient = createOrderDto.fromClient ?? false;
      order.deliveryStatus = (createOrderDto.deliveryStatus as any) ?? null;

      if (order.deliveryStatus) {
        const now = new Date();
        switch (order.deliveryStatus) {
          case DeliveryStatus.PENDING:
            order.pendingAt = now;
            break;
          case DeliveryStatus.ASSIGNED:
            order.assignedAt = now;
            break;
          case DeliveryStatus.CONFIRMED:
            order.confirmedAt = now;
            break;
          case DeliveryStatus.PICKED_UP:
            order.pickedUpAt = now;
            break;
          case DeliveryStatus.TO_DELIVERY:
            order.toDeliveryAt = now;
            break;
          case DeliveryStatus.IN_DELIVERY:
            order.inDeliveryAt = now;
            break;
          case DeliveryStatus.DELIVERED:
            order.deliveredAt = now;
            break;
          case DeliveryStatus.CANCELED:
            order.canceledAt = now;
            break;
          default:
            break;
        }
      }

      // Orders from POS/Portal are automatically validated and in progress
      if (createOrderDto.fromPortal) {
        order.status = OrderStatus.IN_PROGRESS;
        order.isValidated = true;
      } else {
        order.status = OrderStatus.DRAFT;
        order.isValidated = false;
      }

      const savedOrder = await manager.save(Order, order);

      // Update sequence number only for portal orders (those with immediate sequence)
      if (createOrderDto.fromPortal) {
        const sequence = await this.getOrCreateSequence(
          'delivery_note',
          createOrderDto.date,
        );
        await this.updateSequenceNextNumber('delivery_note', sequence);

        const receiptSequence = await this.getOrCreateSequence(
          'receipt',
          createOrderDto.date,
        );
        await this.updateSequenceNextNumber('receipt', receiptSequence);
      }

      // Resolve product IDs — set to null if the product no longer exists
      // (productId is nullable with onDelete: SET NULL, so stale cart items are allowed)
      const productIds = items
        .map((item) => item.productId)
        .filter((id): id is number => id != null);
      let validProductIdSet = new Set<number>();
      if (productIds.length > 0) {
        const existingProducts = await manager.find(Product, {
          where: { id: In(productIds) },
          select: ['id'],
        });
        validProductIdSet = new Set(existingProducts.map((p) => p.id));
      }

      // Create order items with values from frontend
      const orderItems = items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId:
            item.productId != null && validProductIdSet.has(item.productId)
              ? item.productId
              : null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax,
          total: item.total ?? 0,
        }),
      );

      await manager.save(OrderItem, orderItems);

      // Fetch the created order with relations within the same transaction
      const createdOrder = await manager
        .createQueryBuilder(Order, 'order')
        .leftJoin('order.customer', 'customer')
        .leftJoin('order.supplier', 'supplier')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoin('items.product', 'product')
        .select([
          'order.id',
          'order.documentNumber',
          'order.receiptNumber',
          'order.date',
          'order.dueDate',
          'order.validationDate',
          'order.subtotal',
          'order.tax',
          'order.discount',
          'order.discountType',
          'order.total',
          'order.status',
          'order.direction',
          'order.notes',
          'order.fromPortal',
          'order.fromClient',
          'order.deliveryStatus',
          'order.pendingAt',
          'order.assignedAt',
          'order.confirmedAt',
          'order.pickedUpAt',
          'order.toDeliveryAt',
          'order.inDeliveryAt',
          'order.deliveredAt',
          'order.canceledAt',
          'order.dateCreated',
          'order.dateUpdated',
          'customer.id',
          'customer.name',
          'customer.phoneNumber',
          'customer.address',
          'customer.ice',
          'supplier.id',
          'supplier.name',
          'supplier.phoneNumber',
          'supplier.address',
          'supplier.ice',
          'items.id',
          'items.orderId',
          'items.productId',
          'items.description',
          'items.quantity',
          'items.unitPrice',
          'items.discount',
          'items.discountType',
          'items.tax',
          'items.total',
          'product.id',
          'product.name',
          'product.price',
        ])
        .where('order.id = :id', { id: savedOrder.id })
        .getOne();

      if (!createdOrder) {
        throw new NotFoundException(`Order with ID ${savedOrder.id} not found`);
      }

      return {
        id: createdOrder.id,
        orderNumber: createdOrder.documentNumber,
        receiptNumber: createdOrder.receiptNumber,
        date: createdOrder.date,
        dueDate: createdOrder.dueDate,
        validationDate: createdOrder.validationDate,
        subtotal: createdOrder.subtotal,
        tax: createdOrder.tax,
        discount: createdOrder.discount,
        discountType: createdOrder.discountType,
        total: createdOrder.total,
        status: createdOrder.status || 'draft',
        direction: createdOrder.direction,
        note: createdOrder.notes,
        fromPortal: createdOrder.fromPortal || false,
        fromClient: createdOrder.fromClient || false,
        deliveryStatus: createdOrder.deliveryStatus || null,
        pendingAt: createdOrder.pendingAt,
        assignedAt: createdOrder.assignedAt,
        confirmedAt: createdOrder.confirmedAt,
        pickedUpAt: createdOrder.pickedUpAt,
        toDeliveryAt: createdOrder.toDeliveryAt,
        inDeliveryAt: createdOrder.inDeliveryAt,
        deliveredAt: createdOrder.deliveredAt,
        canceledAt: createdOrder.canceledAt,
        dateCreated: createdOrder.dateCreated,
        dateUpdated: createdOrder.dateUpdated,
        customerId: createdOrder.customer?.id,
        customerName: createdOrder.customer?.name,
        customerPhone: createdOrder.customer?.phoneNumber,
        customerAddress: createdOrder.customer?.address,
        supplierId: createdOrder.supplier?.id,
        supplierName: createdOrder.supplier?.name,
        supplierPhone: createdOrder.supplier?.phoneNumber,
        supplierAddress: createdOrder.supplier?.address,
        items:
          createdOrder.items?.map((item) => ({
            id: item.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            discount: item.discount,
            discountType: item.discountType,
            tax: item.tax,
          })) || [],
      };
    });

    // RULE 1: When a client creates an order, notify admins
    if (createOrderDto.fromClient && result) {
      // Load the full order with customer relation for notification
      const fullOrder = await this.orderRepository.findOne({
        where: { id: result.id },
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

    return result;
  }

  async getAllOrders(
    limit = 100,
    fromPortal?: boolean,
    deliveryStatus?: string,
    fromClient?: boolean,
    startDate?: Date,
    endDate?: Date,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{ orders: any[]; count: number; statusCounts: any }> {
    // Build main query with filters
    const queryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([
        'order.id',
        'order.documentNumber',
        'order.receiptNumber',
        'order.date',
        'order.dueDate',
        'order.validationDate',
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
        'order.direction',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.fromClient',
        'order.deliveryStatus',
        'order.pendingAt',
        'order.assignedAt',
        'order.confirmedAt',
        'order.pickedUpAt',
        'order.toDeliveryAt',
        'order.inDeliveryAt',
        'order.deliveredAt',
        'order.canceledAt',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
        'customer.ice',
      ])
      .take(limit)
      .orderBy('order.dateCreated', 'DESC');

    // Apply filters
    if (fromPortal !== undefined) {
      queryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
    }

    if (deliveryStatus) {
      if (queryBuilder.getParameters().length > 0) {
        queryBuilder.andWhere('order.deliveryStatus = :deliveryStatus', {
          deliveryStatus,
        });
      } else {
        queryBuilder.where('order.deliveryStatus = :deliveryStatus', {
          deliveryStatus,
        });
      }
    }

    if (fromClient !== undefined) {
      if (queryBuilder.getParameters().length > 0) {
        queryBuilder.andWhere('order.fromClient = :fromClient', {
          fromClient,
        });
      } else {
        queryBuilder.where('order.fromClient = :fromClient', {
          fromClient,
        });
      }
    }

    if (direction) {
      queryBuilder.andWhere('order.direction = :direction', { direction });
    }

    // Apply date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('order.dateCreated >= :startDate', { startDate });
      queryBuilder.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const orders = await queryBuilder.getMany();

    // Get count of each delivery status (for all orders, not just filtered)
    const countQueryBuilder = this.dataSource.createQueryBuilder(
      Order,
      'order',
    );

    // Apply same filters for counting
    if (fromPortal !== undefined) {
      countQueryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
    }
    if (direction) {
      countQueryBuilder.andWhere('order.direction = :direction', { direction });
    }
    if (startDate && endDate) {
      countQueryBuilder.andWhere('order.dateCreated >= :startDate', {
        startDate,
      });
      countQueryBuilder.andWhere('order.dateCreated <= :endDate', {
        endDate,
      });
    }

    const allOrdersForCounts = await countQueryBuilder.getMany();

    const statusCounts = {
      all: allOrdersForCounts.length,
      pending: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.PENDING,
      ).length,
      assigned: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.ASSIGNED,
      ).length,
      confirmed: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.CONFIRMED,
      ).length,
      picked_up: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.PICKED_UP,
      ).length,
      to_delivery: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.TO_DELIVERY,
      ).length,
      in_delivery: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.IN_DELIVERY,
      ).length,
      delivered: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.DELIVERED,
      ).length,
      canceled: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.CANCELED,
      ).length,
    };

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.documentNumber,
        receiptNumber: order.receiptNumber,
        date: order.date,
        dueDate: order.dueDate,
        validationDate: order.validationDate,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        discountType: order.discountType,
        total: order.total,
        status: order.status || 'draft',
        direction: order.direction,
        isValidated: order.isValidated || false,
        note: order.notes,
        fromPortal: order.fromPortal || false,
        fromClient: order.fromClient || false,
        deliveryStatus: order.deliveryStatus || null,
        pendingAt: order.pendingAt,
        assignedAt: order.assignedAt,
        confirmedAt: order.confirmedAt,
        pickedUpAt: order.pickedUpAt,
        toDeliveryAt: order.toDeliveryAt,
        inDeliveryAt: order.inDeliveryAt,
        deliveredAt: order.deliveredAt,
        canceledAt: order.canceledAt,
        dateCreated: order.dateCreated,
        dateUpdated: order.dateUpdated,
        customerId: order.customer?.id,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phoneNumber,
        customerAddress: order.customer?.address,
        items: [], // Items not needed for list view
      })),
      count: orders.length,
      statusCounts,
    };
  }

  async filterOrders(
    startDate?: Date,
    endDate?: Date,
    deliveryStatus?: string[],
    orderNumber?: string,
    customerId?: number,
    deliveryPersonId?: number,
    fromPortal?: boolean,
    fromClient?: boolean,
    page: number = 1,
    pageSize: number = 50,
    supplierId?: number,
    direction?: 'ACHAT' | 'VENTE',
  ): Promise<{
    orders: any[];
    count: number;
    totalCount: number;
    statusCounts: any;
  }> {
    const offset = (page - 1) * pageSize;

    // Build main query with filters
    const queryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('order.supplier', 'supplier')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
      .select([
        'order.id',
        'order.documentNumber',
        'order.receiptNumber',
        'order.date',
        'order.dueDate',
        'order.validationDate',
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
        'order.direction',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.fromClient',
        'order.deliveryStatus',
        'order.pendingAt',
        'order.assignedAt',
        'order.confirmedAt',
        'order.pickedUpAt',
        'order.toDeliveryAt',
        'order.inDeliveryAt',
        'order.deliveredAt',
        'order.canceledAt',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
        'customer.ice',
        'supplier.id',
        'supplier.name',
        'supplier.phoneNumber',
        'supplier.address',
        'supplier.ice',
      ])
      .orderBy('order.dateCreated', 'DESC');

    // Apply filters
    if (fromPortal !== undefined) {
      queryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
    }

    if (fromClient !== undefined) {
      if (Object.keys(queryBuilder.expressionMap.wheres).length > 0) {
        queryBuilder.andWhere('order.fromClient = :fromClient', { fromClient });
      } else {
        queryBuilder.where('order.fromClient = :fromClient', { fromClient });
      }
    }

    if (orderNumber) {
      queryBuilder.andWhere('order.documentNumber = :orderNumber', {
        orderNumber,
      });
    }

    if (deliveryStatus && deliveryStatus.length > 0) {
      if (Object.keys(queryBuilder.expressionMap.wheres).length > 0) {
        queryBuilder.andWhere(
          'order.deliveryStatus IN (:...deliveryStatuses)',
          { deliveryStatuses: deliveryStatus },
        );
      } else {
        queryBuilder.where('order.deliveryStatus IN (:...deliveryStatuses)', {
          deliveryStatuses: deliveryStatus,
        });
      }
    }

    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
    }

    if (supplierId) {
      queryBuilder.andWhere('order.supplierId = :supplierId', { supplierId });
    }

    if (direction) {
      queryBuilder.andWhere('order.direction = :direction', { direction });
    }

    if (deliveryPersonId) {
      queryBuilder.andWhere('delivery.deliveryPersonId = :deliveryPersonId', {
        deliveryPersonId,
      });
    }

    // Apply date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('order.dateCreated >= :startDate', { startDate });
      queryBuilder.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    // Add pagination
    queryBuilder.skip(offset).take(pageSize);

    const orders = await queryBuilder.getMany();

    // Get count of each delivery status
    const countQueryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id');

    // Apply same filters for counting
    if (fromPortal !== undefined) {
      countQueryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
    }
    if (fromClient !== undefined) {
      if (Object.keys(countQueryBuilder.expressionMap.wheres).length > 0) {
        countQueryBuilder.andWhere('order.fromClient = :fromClient', {
          fromClient,
        });
      } else {
        countQueryBuilder.where('order.fromClient = :fromClient', {
          fromClient,
        });
      }
    }
    if (orderNumber) {
      countQueryBuilder.andWhere('order.documentNumber = :orderNumber', {
        orderNumber,
      });
    }
    if (startDate && endDate) {
      countQueryBuilder.andWhere('order.dateCreated >= :startDate', {
        startDate,
      });
      countQueryBuilder.andWhere('order.dateCreated <= :endDate', {
        endDate,
      });
    }
    if (customerId) {
      countQueryBuilder.andWhere('order.customerId = :customerId', {
        customerId,
      });
    }
    if (deliveryPersonId) {
      countQueryBuilder.andWhere(
        'delivery.deliveryPersonId = :deliveryPersonId',
        {
          deliveryPersonId,
        },
      );
    }
    if (direction) {
      countQueryBuilder.andWhere('order.direction = :direction', { direction });
    }

    const allOrdersForCounts = await countQueryBuilder.getMany();
    const totalCount = allOrdersForCounts.length;

    const statusCounts = {
      all: allOrdersForCounts.length,
      pending: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.PENDING,
      ).length,
      assigned: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.ASSIGNED,
      ).length,
      confirmed: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.CONFIRMED,
      ).length,
      picked_up: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.PICKED_UP,
      ).length,
      to_delivery: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.TO_DELIVERY,
      ).length,
      in_delivery: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.IN_DELIVERY,
      ).length,
      delivered: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.DELIVERED,
      ).length,
      canceled: allOrdersForCounts.filter(
        (o) => o.deliveryStatus === DeliveryStatus.CANCELED,
      ).length,
    };

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.documentNumber,
        receiptNumber: order.receiptNumber,
        date: order.date,
        dueDate: order.dueDate,
        validationDate: order.validationDate,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        discountType: order.discountType,
        total: order.total,
        status: order.status || 'draft',
        direction: order.direction,
        isValidated: order.isValidated || false,
        note: order.notes,
        fromPortal: order.fromPortal || false,
        fromClient: order.fromClient || false,
        deliveryStatus: order.deliveryStatus || null,
        pendingAt: order.pendingAt,
        assignedAt: order.assignedAt,
        confirmedAt: order.confirmedAt,
        pickedUpAt: order.pickedUpAt,
        toDeliveryAt: order.toDeliveryAt,
        inDeliveryAt: order.inDeliveryAt,
        deliveredAt: order.deliveredAt,
        canceledAt: order.canceledAt,
        dateCreated: order.dateCreated,
        dateUpdated: order.dateUpdated,
        customerId: order.customer?.id,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phoneNumber,
        customerAddress: order.customer?.address,
        items: [], // Items not needed for list view
      })),
      count: orders.length,
      totalCount,
      statusCounts,
    };
  }

  private async invalidateOrderCache(id?: number) {
    if (id) await this.cacheManager.del(`order:${id}`);
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
        'order.id',
        'order.documentNumber',
        'order.receiptNumber',
        'order.date',
        'order.dueDate',
        'order.validationDate',
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
        'order.direction',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.fromClient',
        'order.deliveryStatus',
        'order.pendingAt',
        'order.assignedAt',
        'order.confirmedAt',
        'order.pickedUpAt',
        'order.toDeliveryAt',
        'order.inDeliveryAt',
        'order.deliveredAt',
        'order.canceledAt',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
        'customer.ice',
        'supplier.id',
        'supplier.name',
        'supplier.phoneNumber',
        'supplier.address',
        'supplier.ice',
        'items.id',
        'items.productId',
        'items.description',
        'items.quantity',
        'items.unitPrice',
        'items.discount',
        'items.discountType',
        'items.tax',
        'items.total',
        'product.id',
        'product.name',
        'product.price',
      ])
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const result = {
      id: order.id,
      orderNumber: order.documentNumber,
      receiptNumber: order.receiptNumber,
      date: order.date,
      dueDate: order.dueDate,
      validationDate: order.validationDate,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      discountType: order.discountType,
      total: order.total,
      status: order.status || 'draft',
      direction: order.direction,
      isValidated: order.isValidated || false,
      note: order.notes,
      fromPortal: order.fromPortal || false,
      fromClient: order.fromClient || false,
      deliveryStatus: order.deliveryStatus || null,
      pendingAt: order.pendingAt,
      assignedAt: order.assignedAt,
      confirmedAt: order.confirmedAt,
      pickedUpAt: order.pickedUpAt,
      toDeliveryAt: order.toDeliveryAt,
      inDeliveryAt: order.inDeliveryAt,
      deliveredAt: order.deliveredAt,
      canceledAt: order.canceledAt,
      dateCreated: order.dateCreated,
      dateUpdated: order.dateUpdated,
      customerId: order.customer?.id,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phoneNumber,
      customerAddress: order.customer?.address,
      supplierId: order.supplier?.id,
      supplierName: order.supplier?.name,
      supplierPhone: order.supplier?.phoneNumber,
      supplierAddress: order.supplier?.address,
      items:
        order.items?.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
        })) || [],
    };

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
        'order.id',
        'order.documentNumber',
        'order.receiptNumber',
        'order.date',
        'order.dueDate',
        'order.validationDate',
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
        'order.direction',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.fromClient',
        'order.deliveryStatus',
        'order.pendingAt',
        'order.assignedAt',
        'order.confirmedAt',
        'order.pickedUpAt',
        'order.toDeliveryAt',
        'order.inDeliveryAt',
        'order.deliveredAt',
        'order.canceledAt',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
        'customer.ice',
        'supplier.id',
        'supplier.name',
        'supplier.phoneNumber',
        'supplier.address',
        'supplier.ice',
        'items.id',
        'items.orderId',
        'items.productId',
        'items.description',
        'items.quantity',
        'items.unitPrice',
        'items.discount',
        'items.discountType',
        'items.tax',
        'items.total',
        'product.id',
        'product.name',
        'product.price',
      ])
      .where('order.documentNumber = :orderNumber', { orderNumber })
      .getOne();

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderNumber: order.documentNumber,
      receiptNumber: order.receiptNumber,
      date: order.date,
      dueDate: order.dueDate,
      validationDate: order.validationDate,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      discountType: order.discountType,
      total: order.total,
      status: order.status || 'draft',
      direction: order.direction,
      isValidated: order.isValidated || false,
      note: order.notes,
      fromPortal: order.fromPortal || false,
      fromClient: order.fromClient || false,
      deliveryStatus: order.deliveryStatus || null,
      pendingAt: order.pendingAt,
      assignedAt: order.assignedAt,
      confirmedAt: order.confirmedAt,
      pickedUpAt: order.pickedUpAt,
      toDeliveryAt: order.toDeliveryAt,
      inDeliveryAt: order.inDeliveryAt,
      deliveredAt: order.deliveredAt,
      canceledAt: order.canceledAt,
      dateCreated: order.dateCreated,
      dateUpdated: order.dateUpdated,
      customerId: order.customer?.id,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phoneNumber,
      customerAddress: order.customer?.address,
      supplierId: order.supplier?.id,
      supplierName: order.supplier?.name,
      supplierPhone: order.supplier?.phoneNumber,
      supplierAddress: order.supplier?.address,
      items:
        order.items?.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
        })) || [],
    };
  }

  async getCustomerOrders(
    customerId: number,
    page: number = 1,
    pageSize: number = 10,
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
    let query = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([
        'order.id',
        'order.documentNumber',
        'order.receiptNumber',
        'order.date',
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
        'order.direction',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.fromClient',
        'order.deliveryStatus',
        'order.pendingAt',
        'order.assignedAt',
        'order.confirmedAt',
        'order.pickedUpAt',
        'order.toDeliveryAt',
        'order.inDeliveryAt',
        'order.deliveredAt',
        'order.canceledAt',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
      ])
      .where('order.customerId = :customerId', { customerId });

    // Apply order number filter
    if (orderNumber && orderNumber.trim()) {
      query = query.andWhere('order.documentNumber LIKE :orderNumber', {
        orderNumber: `%${orderNumber}%`,
      });
    }

    // Apply delivery status filter
    if (deliveryStatus && deliveryStatus !== 'all') {
      query = query.andWhere('order.deliveryStatus = :deliveryStatus', {
        deliveryStatus,
      });
    }

    // Apply date range filter
    if (startDate) {
      query = query.andWhere('order.dateCreated >= :startDate', { startDate });
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.andWhere('order.dateCreated <= :endDate', {
        endDate: endOfDay,
      });
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    query = query.skip(skip).take(pageSize);

    const orders = await query.orderBy('order.dateCreated', 'DESC').getMany();

    const totalPages = Math.ceil(total / pageSize);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.documentNumber,
        receiptNumber: order.receiptNumber,
        date: order.date,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        discountType: order.discountType,
        total: order.total,
        status: order.status || 'draft',
        direction: order.direction,
        isValidated: order.isValidated || false,
        note: order.notes,
        fromPortal: order.fromPortal || false,
        fromClient: order.fromClient || false,
        deliveryStatus: order.deliveryStatus || null,
        pendingAt: order.pendingAt,
        assignedAt: order.assignedAt,
        confirmedAt: order.confirmedAt,
        pickedUpAt: order.pickedUpAt,
        toDeliveryAt: order.toDeliveryAt,
        inDeliveryAt: order.inDeliveryAt,
        deliveredAt: order.deliveredAt,
        canceledAt: order.canceledAt,
        dateCreated: order.dateCreated,
        dateUpdated: order.dateUpdated,
        customerId: order.customer?.id,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phoneNumber,
        customerAddress: order.customer?.address,
        items: [],
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
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
        let prefix = 'CMD'; // Default
        if (entityType === 'delivery_note') {
          prefix = 'BL';
        } else if (entityType === 'purchase_order') {
          prefix = 'BA';
        } else if (entityType === 'receipt') {
          prefix = '';
        }
        const isReceipt = entityType === 'receipt';
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
          dayInPrefix: isReceipt,
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
      let prefix = 'CMD'; // Default
      if (entityType === 'delivery_note') {
        prefix = 'BL';
      } else if (entityType === 'purchase_order') {
        prefix = 'BA';
      } else if (entityType === 'receipt') {
        prefix = '';
      }
      const isReceipt = entityType === 'receipt';
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
        dayInPrefix: isReceipt,
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
      // Build the current pattern for this sequence using document date (e.g., "BL 2026-02-")
      const pattern = this.buildSequencePattern(sequence, documentDate);

      // Find all orders with document numbers matching this pattern
      const orders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.documentNumber LIKE :pattern', {
          pattern: `${pattern}%`,
        })
        .andWhere('order.documentNumber NOT LIKE :provisional', {
          provisional: 'PROV%',
        })
        .getMany();

      if (orders.length === 0) {
        // No orders found for this pattern, reset to 1
        sequence.nextNumber = 1;
        return;
      }

      // Extract all sequence numbers from the orders
      const numbers = orders
        .map((order) => {
          // Remove the pattern prefix to get just the number part
          const numberPart = order.documentNumber.replace(pattern, '');
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
          ? '02'
          : currentMonth <= 9
            ? '03'
            : '04';

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

    const currentMonth = now.getMonth() + 1;
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '02'
          : currentMonth <= 9
            ? '03'
            : '04';

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

  async validate(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Order is already validated');
    }

    // Only convert PROV numbers to permanent sequence numbers
    if (order.documentNumber.startsWith('PROV')) {
      // Determine sequence type based on order direction
      const sequenceType = order.supplierId
        ? 'purchase_order'
        : 'delivery_note';

      const sequence = await this.getOrCreateSequence(sequenceType, order.date);
      const finalOrderNumber = this.generateSequenceNumber(
        sequence,
        order.date,
      );

      // Update order with permanent number, validated status, and in progress
      await this.orderRepository.update(id, {
        documentNumber: finalOrderNumber,
        isValidated: true,
        validationDate: new Date(),
        status: OrderStatus.IN_PROGRESS,
      });

      // Increment sequence counter
      await this.updateSequenceNextNumber(sequenceType, sequence);
    } else {
      // Already has a sequence number (portal orders), just mark as validated
      await this.orderRepository.update(id, {
        isValidated: true,
        validationDate: new Date(),
        status: OrderStatus.IN_PROGRESS,
      });
    }

    await this.invalidateOrderCache(id);
    // Generate PDF and store in MinIO (non-blocking — failure doesn't abort validation)
    const pdfUrl = await this.pdfService.generateAndUploadPDF(
      'delivery-note',
      id,
    );
    if (pdfUrl) {
      await this.orderRepository.update(id, { pdfUrl });
    }
    return await this.getOrderById(id);
  }

  async devalidate(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.isValidated) {
      throw new BadRequestException('Order is not validated');
    }

    // Update sequence nextNumber to match the last document in database
    try {
      // Determine sequence type based on order direction
      const sequenceType = order.supplierId
        ? 'purchase_order'
        : 'delivery_note';

      const sequence = await this.getOrCreateSequence(sequenceType, order.date);
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = (config?.values?.sequences as SequenceConfig[]) || [];
      const sequenceIndex = sequences.findIndex(
        (seq) => seq.id === sequence.id,
      );

      if (sequenceIndex !== -1) {
        // Find the highest document number in database with this sequence pattern
        const pattern = this.buildSequencePattern(sequence, order.date);
        const lastOrder = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.documentNumber LIKE :pattern', {
            pattern: pattern + '%',
          })
          .andWhere('order.isValidated = :validated', { validated: true })
          .orderBy(
            "CAST(SUBSTRING(order.documentNumber FROM '[0-9]+$') AS INTEGER)",
            'DESC',
          )
          .limit(1)
          .getOne();

        let nextNumber = 1;
        if (lastOrder) {
          const match = lastOrder.documentNumber.match(/(\d+)$/);
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
    if (order.documentNumber.startsWith('PROV')) {
      nextProvNumber = order.documentNumber;
    } else {
      // Find all PROV numbers to get the maximum
      const allProvOrders = await this.orderRepository
        .createQueryBuilder('order')
        .select('order.documentNumber')
        .where('order.documentNumber LIKE :pattern', { pattern: 'PROV%' })
        .andWhere('order.id != :currentId', { currentId: id })
        .getMany();

      let maxProvNumber = 0;
      for (const provOrder of allProvOrders) {
        const match = provOrder.documentNumber.match(/PROV(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxProvNumber) {
            maxProvNumber = num;
          }
        }
      }

      nextProvNumber = `PROV${maxProvNumber + 1}`;
    }

    // Update order back to draft status with new provisional number
    await this.pdfService.deletePDF(order.pdfUrl);
    await this.orderRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      validationDate: null,
      status: OrderStatus.DRAFT,
      pdfUrl: null,
    });

    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async updateOrder(
    id: number,
    updateOrderDto: Partial<CreateOrderDto>,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Prevent updates to validated orders
    if (order.isValidated) {
      throw new BadRequestException(
        'Cannot update a validated order. Devalidate first if changes are needed.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Update order fields with values from frontend
      if (updateOrderDto.notes !== undefined) {
        order.notes = updateOrderDto.notes;
      }
      if (updateOrderDto.total !== undefined) {
        order.total = updateOrderDto.total;
      }
      if (updateOrderDto.subtotal !== undefined) {
        order.subtotal = updateOrderDto.subtotal;
      }
      if (updateOrderDto.tax !== undefined) {
        order.tax = updateOrderDto.tax;
      }
      if (updateOrderDto.discount !== undefined) {
        order.discount = updateOrderDto.discount;
      }
      if (updateOrderDto.discountType !== undefined) {
        order.discountType = updateOrderDto.discountType;
      }
      if (updateOrderDto.date !== undefined) {
        order.date = new Date(updateOrderDto.date);
      }
      if (updateOrderDto.dueDate !== undefined) {
        order.dueDate = updateOrderDto.dueDate
          ? new Date(updateOrderDto.dueDate)
          : null;
      }
      if (updateOrderDto.customerId !== undefined) {
        order.customerId = updateOrderDto.customerId;
      }
      if (updateOrderDto.customerName !== undefined) {
        order.customerName = updateOrderDto.customerName;
      }
      if (updateOrderDto.customerPhone !== undefined) {
        order.customerPhone = updateOrderDto.customerPhone;
      }
      if (updateOrderDto.customerAddress !== undefined) {
        order.customerAddress = updateOrderDto.customerAddress;
      }
      if (updateOrderDto.supplierId !== undefined) {
        order.supplierId = updateOrderDto.supplierId;
      }
      if (updateOrderDto.supplierName !== undefined) {
        order.supplierName = updateOrderDto.supplierName;
      }
      if (updateOrderDto.supplierPhone !== undefined) {
        order.supplierPhone = updateOrderDto.supplierPhone;
      }
      if (updateOrderDto.supplierAddress !== undefined) {
        order.supplierAddress = updateOrderDto.supplierAddress;
      }

      const finalSupplierId =
        updateOrderDto.supplierId !== undefined
          ? updateOrderDto.supplierId
          : order.supplierId;
      order.direction = finalSupplierId
        ? DocumentDirection.ACHAT
        : DocumentDirection.VENTE;

      // Update deliveryStatus and corresponding timestamp
      if (updateOrderDto.deliveryStatus !== undefined) {
        // Validate cancellation - only allow if current status is pending, assigned, or confirmed
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (updateOrderDto.deliveryStatus === 'canceled') {
          const allowedStatuses = [
            DeliveryStatus.PENDING,
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.CONFIRMED,
          ];
          if (
            order.deliveryStatus &&
            !allowedStatuses.includes(order.deliveryStatus)
          ) {
            throw new BadRequestException(
              `Cannot cancel delivery. Order status is '${order.deliveryStatus}'. Cancellation is only allowed for pending, assigned, or confirmed orders.`,
            );
          }
        }

        order.deliveryStatus = updateOrderDto.deliveryStatus as any;
        const now = new Date();
        switch (updateOrderDto.deliveryStatus as any) {
          case DeliveryStatus.PENDING:
            order.pendingAt = now;
            break;
          case DeliveryStatus.ASSIGNED:
            order.assignedAt = now;
            break;
          case DeliveryStatus.CONFIRMED:
            order.confirmedAt = now;
            break;
          case DeliveryStatus.PICKED_UP:
            order.pickedUpAt = now;
            break;
          case DeliveryStatus.TO_DELIVERY:
            order.toDeliveryAt = now;
            break;
          case DeliveryStatus.IN_DELIVERY:
            order.inDeliveryAt = now;
            break;
          case DeliveryStatus.DELIVERED:
            order.deliveredAt = now;
            break;
          case DeliveryStatus.CANCELED:
            order.canceledAt = now;
            break;
          default:
            break;
        }
      }

      // Save order updates first
      await manager.save(Order, order);

      // Update items if provided
      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        // Delete existing items
        await manager.delete(OrderItem, { orderId: id });

        // Create new items using insert to avoid TypeORM trying to update
        const itemsToInsert = updateOrderDto.items.map((item) => ({
          orderId: id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax || 0,
          total: item.total ?? 0,
        }));

        await manager.insert(OrderItem, itemsToInsert);
      }

      await this.invalidateOrderCache(id);
      return await this.getOrderById(id);
    });
  }

  async deliver(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.isValidated) {
      throw new BadRequestException('Order must be validated before delivery');
    }

    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Order must be in progress to be delivered',
      );
    }

    // Update order to delivered status
    await this.orderRepository.update(id, {
      status: OrderStatus.DELIVERED,
    });

    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async cancel(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }

    // Update order to cancelled status
    await this.orderRepository.update(id, {
      status: OrderStatus.CANCELLED,
      isValidated: false, // Reset validation when cancelled
    });

    await this.invalidateOrderCache(id);
    return await this.getOrderById(id);
  }

  async markAsInvoiced(orderId: number, invoiceId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order to invoiced status - use save() to bypass validateStatus hook
    order.status = OrderStatus.INVOICED;
    order.convertedToInvoiceId = invoiceId;
    order.isValidated = true; // Must be validated when invoiced
    await this.orderRepository.save(order);

    await this.invalidateOrderCache(orderId);
    return await this.getOrderById(orderId);
  }

  async remove(id: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Delete order items first (cascade should handle this, but being explicit)
    await this.orderItemRepository.delete({ orderId: id });

    // Delete the order
    await this.pdfService.deletePDF(order.pdfUrl);
    await this.orderRepository.delete(id);
    await this.invalidateOrderCache(id);
  }

  async getOrderNumbers(
    search?: string,
    limit: number = 50,
  ): Promise<string[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .select('DISTINCT order.documentNumber', 'documentNumber')
      .orderBy('order.documentNumber', 'DESC')
      .take(limit);

    if (search) {
      queryBuilder.where('order.documentNumber LIKE :search', {
        search: `%${search}%`,
      });
    }

    const results = await queryBuilder.getRawMany<{ documentNumber: string }>();
    return results.map((r) => r.documentNumber);
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number) {
    // Get all orders for the specified year and direction (excluding portal orders)
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.fromPortal = :fromPortal', { fromPortal: false })
      .andWhere(
        'EXTRACT(YEAR FROM COALESCE(order.date, order.dateCreated)) = :year',
        { year },
      );

    // Filter by direction (vente: customer orders, achat: supplier orders)
    if (direction === 'vente') {
      queryBuilder.andWhere('order.customerId IS NOT NULL');
    } else {
      queryBuilder.andWhere('order.supplierId IS NOT NULL');
    }

    const orders = await queryBuilder.getMany();

    // Calculate monthly chart data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.date || order.dateCreated);
        return orderDate.getMonth() === monthIndex;
      });

      return {
        month: monthIndex + 1,
        count: monthOrders.length,
        amount: monthOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        ),
      };
    });

    // Calculate KPIs
    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );
    const deliveredCount = orders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    ).length;
    const inProgressCount = orders.filter(
      (order) =>
        order.status === OrderStatus.IN_PROGRESS ||
        order.status === OrderStatus.VALIDATED,
    ).length;
    const totalItems = orders.reduce(
      (sum, order) => sum + (order.items?.length || 0),
      0,
    );

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalOrders,
        totalAmount,
        deliveredCount,
        inProgressCount,
        totalItems,
      },
    };
  }

  /**
   * Export orders (bon de livraison / bon d'achat) to XLSX format
   */
  async exportToXlsx(supplierId?: number): Promise<Buffer> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.supplier', 'supplier')
      .orderBy('order.dateCreated', 'DESC');

    if (supplierId !== undefined) {
      if (supplierId) {
        queryBuilder.where('order.supplierId = :supplierId', { supplierId });
      } else {
        queryBuilder.where('order.supplierId IS NULL');
      }
    }

    const orders = await queryBuilder.getMany();

    // Flatten data for export - one row per item
    const exportData: any[] = [];

    orders.forEach((order) => {
      const isBonAchat = !!order.supplierId;
      const baseData = {
        Numéro: order.documentNumber,
        Date: order.date
          ? new Date(order.date).toLocaleDateString('fr-FR')
          : '',
        'Date échéance': order.dueDate
          ? new Date(order.dueDate).toLocaleDateString('fr-FR')
          : '',
        Type: isBonAchat ? "Bon d'achat" : 'Bon de livraison',
        'Client/Fournisseur': isBonAchat
          ? order.supplierName || order.supplier?.name || ''
          : order.customerName || order.customer?.name || '',
        Téléphone: isBonAchat
          ? order.supplierPhone || ''
          : order.customerPhone || '',
        Adresse: isBonAchat
          ? order.supplierAddress || order.supplier?.address || ''
          : order.customerAddress || order.customer?.address || '',
        Statut: this.getOrderStatusLabel(order.status),
        'Statut livraison': order.deliveryStatus
          ? this.getDeliveryStatusLabel(order.deliveryStatus)
          : '',
        'Sous-total': Number(order.subtotal),
        Remise: Number(order.discount),
        'Type remise': order.discountType === 0 ? 'Montant' : 'Pourcentage',
        Taxe: Number(order.tax),
        Total: Number(order.total),
        'Du portail': order.fromPortal ? 'Oui' : 'Non',
        'Du client': order.fromClient ? 'Oui' : 'Non',
        Notes: order.notes || '',
      };

      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
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
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
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
          ? "Bons d'achat"
          : 'Bons de livraison'
        : 'Bons';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  private getOrderStatusLabel(status: OrderStatus): string {
    const labels = {
      [OrderStatus.DRAFT]: 'Brouillon',
      [OrderStatus.VALIDATED]: 'Validée',
      [OrderStatus.IN_PROGRESS]: 'En cours',
      [OrderStatus.DELIVERED]: 'Livrée',
      [OrderStatus.INVOICED]: 'Facturée',
      [OrderStatus.CANCELLED]: 'Annulée',
    };
    return labels[status] || status;
  }

  private getDeliveryStatusLabel(status: DeliveryStatus): string {
    const labels = {
      [DeliveryStatus.PENDING]: 'En attente',
      [DeliveryStatus.ASSIGNED]: 'Assignée',
      [DeliveryStatus.CONFIRMED]: 'Confirmée',
      [DeliveryStatus.PICKED_UP]: 'Récupérée',
      [DeliveryStatus.TO_DELIVERY]: 'Vers livraison',
      [DeliveryStatus.IN_DELIVERY]: 'En livraison',
      [DeliveryStatus.DELIVERED]: 'Livrée',
      [DeliveryStatus.CANCELED]: 'Annulée',
    };
    return labels[status] || status;
  }
}
