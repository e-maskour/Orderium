import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portal } from './entities/portal.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
  ) {}

  async findByEmail(email: string): Promise<Portal | null> {
    return this.portalRepository.findOne({ where: { email } });
  }

  async validateUser(emailOrPhone: string, password: string): Promise<Portal | null> {
    // Try to find by email first
    let user = await this.findByEmail(emailOrPhone);
    
    // If not found by email, try phone number
    if (!user) {
      user = await this.findByPhoneNumber(emailOrPhone);
    }
    
    // Validate password if user found
    if (user && user.password && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        return user;
      }
    }
    return null;
  }

  async create(data: Partial<Portal>): Promise<Portal> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const user = this.portalRepository.create(data);
    return this.portalRepository.save(user);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Portal | null> {
    return this.portalRepository.findOne({ where: { phoneNumber } });
  }

  async updateCustomerId(
    phoneNumber: string,
    customerId: number,
  ): Promise<Portal | null> {
    const portal = await this.findByPhoneNumber(phoneNumber);
    if (portal) {
      portal.customerId = customerId;
      portal.isCustomer = true;
      return this.portalRepository.save(portal);
    }
    return null;
  }
}
