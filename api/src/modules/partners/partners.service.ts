import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { Portal } from '../portal/entities/portal.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
  ) {}

  async upsert(
    createPartnerDto: CreatePartnerDto,
    portalPhoneNumber?: string,
  ): Promise<Partner> {
    // Check if partner exists by phone number
    if (createPartnerDto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: createPartnerDto.phoneNumber },
      });

      if (existing) {
        // Update existing partner
        Object.assign(existing, createPartnerDto);
        const updated = await this.partnerRepository.save(existing);
        
        // Update portal if phoneNumber is provided
        if (portalPhoneNumber) {
          await this.updatePortalPartnerId(portalPhoneNumber, updated.id);
        }
        
        return updated;
      }
    }

    // Create new partner with isCustomer: true by default
    const partner = this.partnerRepository.create({
      ...createPartnerDto,
      isCustomer: createPartnerDto.isCustomer !== undefined ? createPartnerDto.isCustomer : true,
      isEnabled: true,
    });
    const savedPartner = await this.partnerRepository.save(partner);
    
    // Update portal with the new partnerId
    if (portalPhoneNumber) {
      await this.updatePortalPartnerId(portalPhoneNumber, savedPartner.id);
    }
    
    return savedPartner;
  }

  private async updatePortalPartnerId(
    phoneNumber: string,
    partnerId: number,
  ): Promise<void> {
    const portal = await this.portalRepository.findOne({
      where: { phoneNumber },
    });
    
    if (portal) {
      portal.customerId = partnerId;
      portal.isCustomer = true;
      await this.portalRepository.save(portal);
    }
  }

  async create(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    // Check if phone number already exists
    if (createPartnerDto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: createPartnerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const partner = this.partnerRepository.create(createPartnerDto);
    return this.partnerRepository.save(partner);
  }

  async findAll(
    limit = 100,
    offset = 0,
    search?: string,
  ): Promise<{ partners: Partner[]; total: number }> {
    const queryBuilder = this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      queryBuilder.andWhere(
        '(partner.name ILIKE :search OR partner.phoneNumber ILIKE :search OR partner.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('partner.name', 'ASC').skip(offset).take(limit);

    const [partners, total] = await queryBuilder.getManyAndCount();

    return { partners, total };
  }

  async findOne(id: number): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async findByPhone(phoneNumber: string): Promise<Partner | null> {
    return this.partnerRepository.findOne({
      where: { phoneNumber },
    });
  }

  async update(
    id: number,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<Partner> {
    const partner = await this.findOne(id);

    // Check if phone number is being changed and already exists
    if (
      updatePartnerDto.phoneNumber &&
      updatePartnerDto.phoneNumber !== partner.phoneNumber
    ) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: updatePartnerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    Object.assign(partner, updatePartnerDto);
    return this.partnerRepository.save(partner);
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findOne(id);
    partner.isEnabled = false;
    await this.partnerRepository.save(partner);
  }
}
