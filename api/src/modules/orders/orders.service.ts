import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';

export interface OrderWithItems {
  Order: Order;
  Items: OrderItem[];
}

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
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<OrderWithItems> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const year = now.getFullYear();

      // Generate document number
      const documentNumber = await this.getNextDocumentNumber(year, manager);

      // Get customer ID
      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerPhone) {
        const partner = await this.partnersService.findByPhone(
          createOrderDto.customerPhone,
        );
        customerId = partner?.id;
      }

      // Get default values from config
      const adminId = createOrderDto.adminId || null;
      const warehouseId =
        createOrderDto.warehouseId ||
        this.configService.get<number>('defaults.warehouseId');
      const documentTypeId =
        createOrderDto.documentTypeId ||
        this.configService.get<number>('defaults.documentTypeId');

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
      order.number = documentNumber;
      order.adminId = adminId;
      order.customerId = customerId ?? null;
      order.orderNumber = documentNumber.split('-')[2];
      order.date = today;
      order.stockDate = today;
      order.total = total;
      order.isClockedOut = false;
      order.documentTypeId = documentTypeId ?? null;
      order.warehouseId = warehouseId ?? null;
      order.note = createOrderDto.note ?? '';
      order.internalNote = createOrderDto.internalNote ?? '';
      order.discount = 0;
      order.discountType = 0;
      order.paidStatus =
        this.configService.get<number>('defaults.paidStatus') ?? 2;
      order.discountApplyRule = 0;
      order.serviceType = 0;

      const savedOrder = await manager.save(Order, order);

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
          quantity: item.quantity,
          expectedQuantity: item.quantity,
          price: item.price,
          priceBeforeTax: item.price,
          discount,
          discountType,
          priceAfterDiscount:
            item.price -
            (discountType === 1 ? (item.price * discount) / 100 : discount),
          total: totalAfterDiscount,
          priceBeforeTaxAfterDiscount:
            item.price -
            (discountType === 1 ? (item.price * discount) / 100 : discount),
          totalAfterDocumentDiscount: totalAfterDiscount,
          productCost: 0,
          discountApplyRule: 0,
        });
      });

      const savedItems = await manager.save(OrderItem, items);

      return {
        Order: savedOrder,
        Items: savedItems,
      };
    });
  }

  async getAllOrders(limit = 100): Promise<Order[]> {
    return this.orderRepository.find({
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer'],
    });
  }

  async getOrderById(id: number): Promise<OrderWithItems> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return {
      Order: order,
      Items: order.items.map(item => ({
        ...item,
        productName: item.product?.name || null,
      })),
    };
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const order = await this.orderRepository.findOne({
      where: { number: orderNumber },
      relations: ['customer', 'items', 'items.product'],
    });

    if (!order) {
      return null;
    }

    return {
      Order: order,
      Items: order.items.map(item => ({
        ...item,
        productName: item.product?.name || null,
      })),
    };
  }

  async getCustomerOrders(customerId: number, limit = 50): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer'],
    });
  }

  private async getNextDocumentNumber(
    year: number,
    manager: EntityManager,
  ): Promise<string> {
    const prefix = year.toString().slice(-2);
    const pattern = `${prefix}-%`;

    const result = await manager
      .createQueryBuilder(Order, 'order')
      .where('order.number LIKE :pattern', { pattern })
      .orderBy('order.number', 'DESC')
      .limit(1)
      .getOne();

    if (!result) {
      return `${prefix}-200-000001`;
    }

    const parts = result.number.split('-');
    const sequence = parseInt(parts[2], 10) + 1;

    return `${prefix}-200-${sequence.toString().padStart(6, '0')}`;
  }
}
