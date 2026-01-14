import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson, OrderDelivery } from './entities/delivery.entity';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(OrderDelivery)
    private readonly orderDeliveryRepository: Repository<OrderDelivery>,
  ) {}

  async getAllDeliveryPersons(): Promise<DeliveryPerson[]> {
    return this.deliveryPersonRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getOrderDeliveries(limit = 100): Promise<OrderDelivery[]> {
    return this.orderDeliveryRepository.find({
      take: limit,
      order: { dateCreated: 'DESC' },
    });
  }

  async getDeliveryPersonOrders(
    deliveryPersonId: number,
  ): Promise<OrderDelivery[]> {
    return this.orderDeliveryRepository.find({
      where: { deliveryPersonId },
      order: { dateCreated: 'DESC' },
    });
  }
}
