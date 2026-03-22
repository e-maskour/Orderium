import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { DeliveryPerson, OrderDelivery } from './entities/delivery.entity';
import {
  Order,
  DeliveryStatus,
  OrderStatus,
} from '../orders/entities/order.entity';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { OrderNotificationService } from '../notifications/order-notification.service';
import * as bcrypt from 'bcrypt';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(forwardRef(() => OrderNotificationService))
    private readonly orderNotificationService: OrderNotificationService,
    private readonly jwtService: JwtService,
  ) { }

  private get deliveryPersonRepository(): Repository<DeliveryPerson> {
    return this.tenantConnService.getRepository(DeliveryPerson);
  }

  private get orderDeliveryRepository(): Repository<OrderDelivery> {
    return this.tenantConnService.getRepository(OrderDelivery);
  }

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  async getAllDeliveryPersons(): Promise<DeliveryPerson[]> {
    return this.deliveryPersonRepository.find({
      order: { name: 'ASC' },
    });
  }

  async login(
    phoneNumber: string,
    password: string,
  ): Promise<{ deliveryPerson: Omit<DeliveryPerson, 'password'>; token: string }> {
    const person = await this.deliveryPersonRepository.findOne({
      where: { phoneNumber },
    });

    if (!person) {
      throw new NotFoundException('Invalid phone number or password');
    }

    if (!person.isActive) {
      throw new NotFoundException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, person.password);
    if (!isPasswordValid) {
      throw new NotFoundException('Invalid phone number or password');
    }

    const { password: _, ...personData } = person;

    const token = this.jwtService.sign({
      sub: personData.id,
      phoneNumber: personData.phoneNumber,
      isAdmin: false,
      isCustomer: false,
      scope: 'portal',
    });

    return { deliveryPerson: personData, token };
  }

  async getDeliveryPersonById(id: number): Promise<DeliveryPerson> {
    const person = await this.deliveryPersonRepository.findOne({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException(`Delivery person with ID ${id} not found`);
    }

    return person;
  }

  async createDeliveryPerson(
    createDto: CreateDeliveryPersonDto,
  ): Promise<DeliveryPerson> {
    // Check if email already exists
    if (createDto.email) {
      const existing = await this.deliveryPersonRepository.findOne({
        where: { email: createDto.email },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const person = this.deliveryPersonRepository.create({
      ...createDto,
      password: hashedPassword,
    });

    return this.deliveryPersonRepository.save(person);
  }

  async updateDeliveryPerson(
    id: number,
    updateDto: UpdateDeliveryPersonDto,
  ): Promise<DeliveryPerson> {
    const person = await this.getDeliveryPersonById(id);

    // Check if email is being changed and already exists
    if (updateDto.email && updateDto.email !== person.email) {
      const existing = await this.deliveryPersonRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if provided
    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }

    Object.assign(person, updateDto);
    return this.deliveryPersonRepository.save(person);
  }

  async deleteDeliveryPerson(id: number): Promise<void> {
    const person = await this.getDeliveryPersonById(id);
    await this.deliveryPersonRepository.remove(person);
  }

  async getOrderDeliveries(limit = 100): Promise<OrderDelivery[]> {
    return this.orderDeliveryRepository.find({
      relations: ['order', 'order.items', 'order.customer', 'deliveryPerson'],
      take: limit,
      order: { dateCreated: 'DESC' },
    });
  }

  async getDeliveryPersonOrders(
    deliveryPersonId: number,
    page: number = 1,
    pageSize: number = 50,
    orderNumber?: string,
    customerName?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ orderDeliveries: OrderDelivery[]; total: number }> {
    const queryBuilder = this.orderDeliveryRepository
      .createQueryBuilder('orderDelivery')
      .leftJoinAndSelect('orderDelivery.order', 'ord')
      .leftJoinAndSelect('ord.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('ord.customer', 'customer')
      .where('orderDelivery.deliveryPersonId = :deliveryPersonId', {
        deliveryPersonId,
      });

    // Apply filters
    if (orderNumber) {
      queryBuilder.andWhere('ord.orderNumber LIKE :orderNumber', {
        orderNumber: `%${orderNumber}%`,
      });
    }

    if (customerName) {
      queryBuilder.andWhere('customer.name LIKE :customerName', {
        customerName: `%${customerName}%`,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('ord.dateCreated >= :startDate', { startDate });
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('ord.dateCreated <= :endDate', {
        endDate: endOfDay,
      });
    }

    const total = await queryBuilder.getCount();

    const orderDeliveries = await queryBuilder
      .orderBy('ord.dateCreated', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { orderDeliveries, total };
  }

  async assignOrderToDelivery(
    orderId: number,
    deliveryPersonId: number,
  ): Promise<OrderDelivery> {
    // Check if delivery already exists for this order
    let orderDelivery = await this.orderDeliveryRepository.findOne({
      where: { orderId },
    });

    if (orderDelivery) {
      // Update existing delivery
      orderDelivery.deliveryPersonId = deliveryPersonId;
      orderDelivery.assignedAt = new Date();
      orderDelivery.status = DeliveryStatus.ASSIGNED;
    } else {
      // Create new delivery
      orderDelivery = this.orderDeliveryRepository.create({
        orderId,
        deliveryPersonId,
        assignedAt: new Date(),
        status: DeliveryStatus.ASSIGNED,
      });
    }

    // Update order deliveryStatus to assigned
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });
    if (order) {
      order.deliveryStatus = DeliveryStatus.ASSIGNED;
      order.assignedAt = new Date();
      await this.orderRepository.save(order);
    }

    const savedDelivery =
      await this.orderDeliveryRepository.save(orderDelivery);

    // RULE 2: When admin assigns order, notify customer and delivery person
    if (order) {
      const deliveryPerson = await this.deliveryPersonRepository.findOne({
        where: { id: deliveryPersonId },
      });
      if (deliveryPerson) {
        this.orderNotificationService
          .notifyOrderAssigned(order, deliveryPersonId, deliveryPerson.name)
          .catch((err) => {
            this.logger.error(
              'Failed to send order assignment notification',
              (err as Error)?.stack,
            );
          });
      }
    }

    return savedDelivery;
  }

  async unassignOrder(orderId: number): Promise<void> {
    const orderDelivery = await this.orderDeliveryRepository.findOne({
      where: { orderId },
    });

    if (orderDelivery) {
      orderDelivery.deliveryPersonId = null;
      orderDelivery.assignedAt = null;
      orderDelivery.status = DeliveryStatus.PENDING;
      orderDelivery.pendingAt = new Date();
      await this.orderDeliveryRepository.save(orderDelivery);
    }

    // Update order deliveryStatus to pending
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (order) {
      order.deliveryStatus = DeliveryStatus.PENDING;
      order.assignedAt = null;
      order.pendingAt = new Date();
      await this.orderRepository.save(order);
    }
  }

  async updateOrderStatus(
    orderId: number,
    status: DeliveryStatus,
    deliveryPersonId: number,
  ): Promise<void> {
    // Find order delivery
    const orderDelivery = await this.orderDeliveryRepository.findOne({
      where: { orderId, deliveryPersonId },
    });

    if (!orderDelivery) {
      throw new NotFoundException(
        `Order delivery not found for order ${orderId} and delivery person ${deliveryPersonId}`,
      );
    }

    // Store old status for notification
    const oldStatus = orderDelivery.status;

    // Update status and corresponding timestamp
    const now = new Date();
    orderDelivery.status = status;

    switch (status) {
      case DeliveryStatus.PENDING:
        orderDelivery.pendingAt = now;
        break;
      case DeliveryStatus.ASSIGNED:
        orderDelivery.assignedAt = now;
        break;
      case DeliveryStatus.CONFIRMED:
        orderDelivery.confirmedAt = now;
        break;
      case DeliveryStatus.PICKED_UP:
        orderDelivery.pickedUpAt = now;
        break;
      case DeliveryStatus.TO_DELIVERY:
        orderDelivery.toDeliveryAt = now;
        break;
      case DeliveryStatus.IN_DELIVERY:
        orderDelivery.inDeliveryAt = now;
        break;
      case DeliveryStatus.DELIVERED:
        orderDelivery.deliveredAt = now;
        break;
      case DeliveryStatus.CANCELED:
        orderDelivery.canceledAt = now;
        break;
    }

    await this.orderDeliveryRepository.save(orderDelivery);

    // Also update the order's deliveryStatus and corresponding timestamp
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });

    if (order) {
      order.deliveryStatus = status;

      // Update order status based on delivery status
      switch (status) {
        case DeliveryStatus.PENDING:
        case DeliveryStatus.ASSIGNED:
        case DeliveryStatus.CONFIRMED:
        case DeliveryStatus.PICKED_UP:
        case DeliveryStatus.TO_DELIVERY:
        case DeliveryStatus.IN_DELIVERY:
          order.status = OrderStatus.IN_PROGRESS;
          break;
        case DeliveryStatus.DELIVERED:
          order.status = OrderStatus.DELIVERED;
          break;
        case DeliveryStatus.CANCELED:
          order.status = OrderStatus.CANCELLED;
          break;
      }

      // Update delivery timestamps
      switch (status) {
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
      }

      await this.orderRepository.save(order);

      // RULE 3: When delivery status changes, notify customer
      this.orderNotificationService
        .notifyDeliveryStatusChanged(order, oldStatus, status)
        .catch((err) => {
          this.logger.error(
            'Failed to send delivery status notification',
            (err as Error)?.stack,
          );
        });
    }
  }
}
