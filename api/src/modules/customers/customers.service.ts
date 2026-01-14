import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check if phone number already exists
    if (createCustomerDto.phoneNumber) {
      const existing = await this.customerRepository.findOne({
        where: { phoneNumber: createCustomerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  async findAll(
    limit = 100,
    offset = 0,
    search?: string,
  ): Promise<{ customers: Customer[]; total: number }> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.phoneNumber ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('customer.name', 'ASC').skip(offset).take(limit);

    const [customers, total] = await queryBuilder.getManyAndCount();

    return { customers, total };
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phoneNumber: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { phoneNumber, isEnabled: true },
    });
  }

  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id);

    // Check if phone number is being changed and already exists
    if (
      updateCustomerDto.phoneNumber &&
      updateCustomerDto.phoneNumber !== customer.phoneNumber
    ) {
      const existing = await this.customerRepository.findOne({
        where: { phoneNumber: updateCustomerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    Object.assign(customer, updateCustomerDto);
    return this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    customer.isEnabled = false;
    await this.customerRepository.save(customer);
  }
}
