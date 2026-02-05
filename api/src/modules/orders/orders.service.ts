/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem, OrderStatus, DeliveryStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { OrderNotificationService } from '../notifications/order-notification.service';

// Removed composite response interface; service now returns `Order` directly.

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly partnersService: PartnersService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(forwardRef(() => OrderNotificationService))
    private readonly orderNotificationService: OrderNotificationService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<any> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const year = now.getFullYear();

      // Get customer ID
      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerPhone) {
        const partner = await this.partnersService.findByPhone(
          createOrderDto.customerPhone,
        );
        customerId = partner?.id;
      }

      // Generate provisional document number (PROV format for draft)
      let documentNumber: string;
      let receiptNumber: string | null = null;
      if (createOrderDto.fromPortal) {
        // Portal orders get immediate sequence number
        const sequence = await this.getOrCreateSequence('delivery_note');
        documentNumber = this.generateSequenceNumber(sequence);

        // Portal orders also get receipt number
        const receiptSequence = await this.getOrCreateSequence('receipt');
        receiptNumber = this.generateSequenceNumber(receiptSequence);
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
      order.date = today;
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
        const sequence = await this.getOrCreateSequence('delivery_note');
        await this.updateSequenceNextNumber('delivery_note', sequence);

        const receiptSequence = await this.getOrCreateSequence('receipt');
        await this.updateSequenceNextNumber('receipt', receiptSequence);
      }

      // Create order items with values from frontend
      const orderItems = items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax,
          total: item.total,
        }),
      );

      await manager.save(OrderItem, orderItems);

      // Fetch the created order with relations within the same transaction
      const createdOrder = await manager
        .createQueryBuilder(Order, 'order')
        .leftJoin('order.customer', 'customer')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoin('items.product', 'product')
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
        subtotal: createdOrder.subtotal,
        tax: createdOrder.tax,
        discount: createdOrder.discount,
        discountType: createdOrder.discountType,
        total: createdOrder.total,
        status: createdOrder.status || 'draft',
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
        this.orderNotificationService.notifyNewOrderFromClient(fullOrder).catch((err) => {
          console.error('Failed to send new order notification:', err);
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
        'order.subtotal',
        'order.tax',
        'order.discount',
        'order.discountType',
        'order.total',
        'order.status',
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

    // Apply date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('order.dateCreated >= :startDate', { startDate });
      queryBuilder.andWhere('order.dateCreated <= :endDate', { endDate });
    }

    const orders = await queryBuilder.getMany();

    // Get count of each delivery status (for all orders, not just filtered)
    const countQueryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order');

    // Apply same filters for counting
    if (fromPortal !== undefined) {
      countQueryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
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
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        discountType: order.discountType,
        total: order.total,
        status: order.status || 'draft',
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
    deliveryStatus?: string,
    orderNumber?: string,
    customerId?: number,
    deliveryPersonId?: number,
    fromPortal?: boolean,
    fromClient?: boolean,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ orders: any[]; count: number; totalCount: number; statusCounts: any }> {
    const offset = (page - 1) * pageSize;

    // Build main query with filters
    const queryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('orders_delivery', 'delivery', 'delivery.orderId = order.id')
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
      queryBuilder.andWhere('order.documentNumber = :orderNumber', { orderNumber });
    }

    if (deliveryStatus) {
      if (Object.keys(queryBuilder.expressionMap.wheres).length > 0) {
        queryBuilder.andWhere('order.deliveryStatus = :deliveryStatus', {
          deliveryStatus,
        });
      } else {
        queryBuilder.where('order.deliveryStatus = :deliveryStatus', {
          deliveryStatus,
        });
      }
    }

    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
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
        countQueryBuilder.andWhere('order.fromClient = :fromClient', { fromClient });
      } else {
        countQueryBuilder.where('order.fromClient = :fromClient', { fromClient });
      }
    }
    if (orderNumber) {
      countQueryBuilder.andWhere('order.documentNumber = :orderNumber', { orderNumber });
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
      countQueryBuilder.andWhere('delivery.deliveryPersonId = :deliveryPersonId', {
        deliveryPersonId,
      });
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
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        discountType: order.discountType,
        total: order.total,
        status: order.status || 'draft',
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

  async getOrderById(id: number): Promise<any> {
    const order = await this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoin('items.product', 'product')
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

    return {
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

  async getOrderByNumber(orderNumber: string): Promise<any | null> {
    const order = await this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoin('items.product', 'product')
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
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      discountType: order.discountType,
      total: order.total,
      status: order.status || 'draft',
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
  ): Promise<{ orders: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
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
      query = query.andWhere('order.deliveryStatus = :deliveryStatus', { deliveryStatus });
    }

    // Apply date range filter
    if (startDate) {
      query = query.andWhere('order.dateCreated >= :startDate', { startDate });
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.andWhere('order.dateCreated <= :endDate', { endDate: endOfDay });
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

  private async getOrCreateSequence(entityType: string): Promise<any> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];

      let sequence = sequences.find(
        (seq) => seq.entityType === entityType && seq.isActive,
      );

      if (!sequence) {
        // Create default sequence
        const now = new Date();
        const prefix = entityType === 'delivery_note' ? 'BL' : entityType === 'receipt' ? '' : 'CMD';
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
          monthInPrefix: isReceipt,
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

      return sequence;
    } catch (error) {
      // Fallback to default if configurations service fails
      const prefix = entityType === 'delivery_note' ? 'BL' : entityType === 'receipt' ? '' : 'CMD';
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
        monthInPrefix: isReceipt,
        dayInPrefix: isReceipt,
        trimesterInPrefix: false,
      };
    }
  }

  private generateSequenceId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private buildSequencePattern(sequence: any): string {
    const now = new Date();
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
    let dateComponents: string[] = [];

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

  private generateSequenceNumber(sequence: any): string {
    const now = new Date();
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
    let dateComponents: string[] = [];

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
    sequence: any,
  ): Promise<void> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];
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
      console.error('Failed to update sequence next number:', error);
    }
  }

  async validate(id: number): Promise<any> {
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
      const sequence = await this.getOrCreateSequence('delivery_note');
      const finalOrderNumber = this.generateSequenceNumber(sequence);

      // Update order with permanent number, validated status, and in progress
      await this.orderRepository.update(id, {
        documentNumber: finalOrderNumber,
        isValidated: true,
        status: OrderStatus.IN_PROGRESS,
      });

      // Increment sequence counter
      await this.updateSequenceNextNumber('delivery_note', sequence);
    } else {
      // Already has a sequence number (portal orders), just mark as validated
      await this.orderRepository.update(id, {
        isValidated: true,
        status: OrderStatus.IN_PROGRESS,
      });
    }

    return await this.getOrderById(id);
  }

  async devalidate(id: number): Promise<any> {
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
      const sequence = await this.getOrCreateSequence('delivery_note');
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];
      const sequenceIndex = sequences.findIndex((seq) => seq.id === sequence.id);

      if (sequenceIndex !== -1) {
        // Find the highest document number in database with this sequence pattern
        const pattern = this.buildSequencePattern(sequence);
        const lastOrder = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.documentNumber LIKE :pattern', { pattern: pattern + '%' })
          .andWhere('order.isValidated = :validated', { validated: true })
          .orderBy('CAST(SUBSTRING(order.documentNumber FROM \'[0-9]+$\') AS INTEGER)', 'DESC')
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
      console.error('Error updating sequence during devalidation:', error);
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
    await this.orderRepository.update(id, {
      documentNumber: nextProvNumber,
      isValidated: false,
      status: OrderStatus.DRAFT,
    });

    return await this.getOrderById(id);
  }

  async updateOrder(id: number, updateOrderDto: Partial<CreateOrderDto>): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Prevent updates to validated orders
    if (order.isValidated) {
      throw new BadRequestException('Cannot update a validated order. Devalidate first if changes are needed.');
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
        order.dueDate = updateOrderDto.dueDate ? new Date(updateOrderDto.dueDate) : null;
      }
      if (updateOrderDto.customerId !== undefined) {
        order.customerId = updateOrderDto.customerId;
      }
      if (updateOrderDto.customerName !== undefined) {
        order.customerName = updateOrderDto.customerName;
      }

      // Update deliveryStatus and corresponding timestamp
      if (updateOrderDto.deliveryStatus !== undefined) {
        // Validate cancellation - only allow if current status is pending, assigned, or confirmed
        if (updateOrderDto.deliveryStatus === 'canceled') {
          const allowedStatuses = [DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED, DeliveryStatus.CONFIRMED];
          if (order.deliveryStatus && !allowedStatuses.includes(order.deliveryStatus as DeliveryStatus)) {
            throw new BadRequestException(
              `Cannot cancel delivery. Order status is '${order.deliveryStatus}'. Cancellation is only allowed for pending, assigned, or confirmed orders.`
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
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax || 0,
          total: item.total || 0,
        }));

        await manager.insert(OrderItem, itemsToInsert);
      }

      return await this.getOrderById(id);
    });
  }

  async deliver(id: number): Promise<any> {
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

    return await this.getOrderById(id);
  }

  async cancel(id: number): Promise<any> {
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

    return await this.getOrderById(id);
  }

  async markAsInvoiced(orderId: number, invoiceId: number): Promise<any> {
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
    await this.orderRepository.delete(id);
  }

  async getOrderNumbers(search?: string, limit: number = 50): Promise<string[]> {
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

    const results = await queryBuilder.getRawMany();
    return results.map((r) => r.documentNumber);
  }
}
