import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';
import { ConfigurationsService } from '../configurations/configurations.service';

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
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<any> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
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

      // Generate document number using sequence
      const sequence = await this.getOrCreateSequence('order');
      const documentNumber = this.generateSequenceNumber(sequence);

      // Calculate total
      const total = createOrderDto.items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const discount = item.discount || 0;
        const discountAmount =
          item.discountType === 1 ? (itemTotal * discount) / 100 : discount;
        return sum + (itemTotal - discountAmount);
      }, 0);

      // Create order
      const order = new Order();
      order.documentNumber = documentNumber;
      order.customerId = customerId ?? null;
      order.date = today;
      order.total = total;
      order.notes = createOrderDto.note ?? '';
      order.discount = 0;
      order.discountType = 0;
      order.fromPortal = createOrderDto.fromPortal ?? false;
      
      // Orders from POS/Portal are automatically validated and in progress
      if (createOrderDto.fromPortal) {
        order.status = OrderStatus.IN_PROGRESS;
        order.isValidated = true;
      } else {
        order.status = OrderStatus.DRAFT;
        order.isValidated = false;
      }

      const savedOrder = await manager.save(Order, order);

      // Update sequence number
      await this.updateSequenceNextNumber('order', sequence);

      // Create order items
      const items = createOrderDto.items.map((item) => {
        const itemTotal = item.price * item.quantity;
        const discount = item.discount || 0;
        const discountType = item.discountType || 0;
        const discountAmount =
          discountType === 1 ? (itemTotal * discount) / 100 : discount;
        const totalAfterDiscount = itemTotal - discountAmount;

        return manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.price,
          discount,
          discountType,
          tax: item.tax || 0,
          total: totalAfterDiscount,
        });
      });

      await manager.save(OrderItem, items);

      // Fetch the created order with relations within the same transaction
      const createdOrder = await manager
        .createQueryBuilder(Order, 'order')
        .leftJoin('order.customer', 'customer')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoin('items.product', 'product')
        .select([
          'order.id',
          'order.documentNumber',
          'order.date',
          'order.total',
          'order.status',
          'order.notes',
          'order.fromPortal',
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
        date: createdOrder.date,
        total: createdOrder.total,
        status: createdOrder.status || 'draft',
        note: createdOrder.notes,
        fromPortal: createdOrder.fromPortal || false,
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
            price: item.unitPrice,
            total: item.total,
            discount: item.discount,
            discountType: item.discountType,
            tax: item.tax,
          })) || [],
      };
    });
  }

  async getAllOrders(limit = 100, fromPortal?: boolean): Promise<any[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([
        'order.id',
        'order.documentNumber',
        'order.date',
        'order.total',
        'order.status',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
      ])
      .take(limit)
      .orderBy('order.dateCreated', 'DESC');

    // Apply fromPortal filter if specified
    if (fromPortal !== undefined) {
      queryBuilder.where('order.fromPortal = :fromPortal', { fromPortal });
    }

    const orders = await queryBuilder.getMany();

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.documentNumber,
      date: order.date,
      total: order.total,
      status: order.status || 'draft',
      isValidated: order.isValidated || false,
      note: order.notes,
      fromPortal: order.fromPortal || false,
      dateCreated: order.dateCreated,
      dateUpdated: order.dateUpdated,
      customerId: order.customer?.id,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phoneNumber,
      customerAddress: order.customer?.address,
      items: [], // Items not needed for list view
    }));
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
        'order.date',
        'order.total',
        'order.status',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
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
      date: order.date,
      total: order.total,
      status: order.status || 'draft',
      isValidated: order.isValidated || false,
      note: order.notes,
      fromPortal: order.fromPortal || false,
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
          price: item.unitPrice,
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
        'order.date',
        'order.total',
        'order.status',
        'order.isValidated',
        'order.notes',
        'order.fromPortal',
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
      date: order.date,
      total: order.total,
      status: order.status || 'draft',
      isValidated: order.isValidated || false,
      note: order.notes,
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
          price: item.unitPrice,
          total: item.total,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
        })) || [],
    };
  }

  async getCustomerOrders(customerId: number, limit = 50): Promise<any[]> {
    const orders = await this.dataSource
      .createQueryBuilder(Order, 'order')
      .leftJoin('order.customer', 'customer')
      .select([
        'order.id',
        'order.documentNumber',
        'order.date',
        'order.total',
        'order.status',
        'order.isValidated',
        'order.notes',
        'order.dateCreated',
        'order.dateUpdated',
        'customer.id',
        'customer.name',
        'customer.phoneNumber',
        'customer.address',
      ])
      .where('order.customerId = :customerId', { customerId })
      .take(limit)
      .orderBy('order.dateCreated', 'DESC')
      .getMany();

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.documentNumber,
      date: order.date,
      total: order.total,
      status: order.status || 'draft',
      isValidated: order.isValidated || false,
      note: order.notes,
      dateCreated: order.dateCreated,
      dateUpdated: order.dateUpdated,
      customerId: order.customer?.id,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phoneNumber,
      customerAddress: order.customer?.address,
      items: [], // Items not needed for list view
    }));
  }

  private async getOrCreateSequence(entityType: string): Promise<any> {
    try {
      const config = await this.configurationsService.findByEntity('sequences');
      const sequences = config?.values?.sequences || [];

      let sequence = sequences.find(
        (seq) => seq.entityType === entityType && seq.isActive,
      );

      if (!sequence) {
        // Create default sequence for orders (bon de livraison)
        const now = new Date();
        const defaultSequence = {
          id: this.generateSequenceId(),
          name: `Sequence ${entityType}`,
          entityType,
          prefix: 'BL', // Bon de Livraison
          suffix: '',
          nextNumber: 1,
          numberLength: 4,
          isActive: true,
          yearInPrefix: true,
          monthInPrefix: false,
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

      return sequence;
    } catch (error) {
      // Fallback to default if configurations service fails
      return {
        id: 'fallback',
        name: 'Default Sequence',
        entityType,
        prefix: 'BL',
        suffix: '',
        nextNumber: 1,
        numberLength: 4,
        isActive: true,
        yearInPrefix: true,
        monthInPrefix: false,
        dayInPrefix: false,
        trimesterInPrefix: false,
      };
    }
  }

  private generateSequenceId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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

    // Update order to validated status
    await this.orderRepository.update(id, {
      isValidated: true,
      status: OrderStatus.IN_PROGRESS,
    });

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

    // Update order back to draft status
    await this.orderRepository.update(id, {
      isValidated: false,
      status: OrderStatus.DRAFT,
    });

    return await this.getOrderById(id);
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
}
