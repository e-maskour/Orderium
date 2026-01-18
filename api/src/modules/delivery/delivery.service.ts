import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson, OrderDelivery } from './entities/delivery.entity';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import * as bcrypt from 'bcrypt';

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
      order: { name: 'ASC' },
    });
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
    const existing = await this.deliveryPersonRepository.findOne({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
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
      take: limit,
      order: { dateCreated: 'DESC' },
    });
  }

  async getDeliveryPersonOrders(
    deliveryPersonId: number,
  ): Promise<OrderDelivery[]> {
    return this.orderDeliveryRepository.find({
      where: { deliveryPerson: { id: deliveryPersonId } },
      order: { dateCreated: 'DESC' },
    });
  }
}
