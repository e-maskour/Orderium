import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from '../partners/entities/partner.entity';
import { CreatePartnerDto } from '../partners/dto/create-partner.dto';
import { UpdatePartnerDto } from '../partners/dto/update-partner.dto';
import { Portal } from '../portal/entities/portal.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Partner)
    private readonly customerRepository: Repository<Partner>,
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
  ) {}

  async upsert(
    createCustomerDto: CreatePartnerDto,
    portalPhoneNumber?: string,
  ): Promise<Partner> {
    // Check if customer exists by phone number
    if (createCustomerDto.phoneNumber) {
      const existing = await this.customerRepository.findOne({
        where: { phoneNumber: createCustomerDto.phoneNumber },
      });

      if (existing) {
        // Update existing customer
        Object.assign(existing, createCustomerDto);
        const updated = await this.customerRepository.save(existing);
        
        // Update portal if phoneNumber is provided
        if (portalPhoneNumber) {
          await this.updatePortalCustomerId(portalPhoneNumber, updated.id);
        }
        
        return updated;
      }
    }

    // Create new customer with isCustomer: true
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      isCustomer: true,
      isEnabled: true,
    });
    const savedCustomer = await this.customerRepository.save(customer);
    
    // Update portal with the new customerId
    if (portalPhoneNumber) {
      await this.updatePortalCustomerId(portalPhoneNumber, savedCustomer.id);
    }
    
    return savedCustomer;
  }

  private async updatePortalCustomerId(
    phoneNumber: string,
    customerId: number,
  ): Promise<void> {
    const portal = await this.portalRepository.findOne({
      where: { phoneNumber },
    });
    
    if (portal) {
      portal.customerId = customerId;
      portal.isCustomer = true;
      await this.portalRepository.save(portal);
    }
  }

  async create(createCustomerDto: CreatePartnerDto): Promise<Partner> {
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
  ): Promise<{ customers: Partner[]; total: number }> {
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

  async findOne(id: number): Promise<Partner> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phoneNumber: string): Promise<Partner | null> {
    return this.customerRepository.findOne({
      where: { phoneNumber },
    });
  }

  async update(
    id: number,
    updateCustomerDto: UpdatePartnerDto,
  ): Promise<Partner> {
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
    
    // Check if customer has invoices
    const invoiceCount = await this.customerRepository.manager.query(
      `SELECT COUNT(*) as count FROM invoices WHERE "customerId" = $1`,
      [id]
    );
    
    if (parseInt(invoiceCount[0]?.count || '0') > 0) {
      throw new ConflictException('Cannot delete customer that has invoices. Please delete all invoices first.');
    }
    
    // Check if customer has orders (if orders table exists)
    try {
      const orderCount = await this.customerRepository.manager.query(
        `SELECT COUNT(*) as count FROM orders WHERE "customerId" = $1`,
        [id]
      );
      
      if (parseInt(orderCount[0]?.count || '0') > 0) {
        throw new ConflictException('Cannot delete customer that has orders. Please delete all orders first.');
      }
    } catch (error) {
      // Orders table might not exist, ignore this check
    }
    
    customer.isEnabled = false;
    await this.customerRepository.save(customer);
  }
}
