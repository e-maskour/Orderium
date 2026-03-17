import { Injectable } from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import { Portal } from './entities/portal.entity';
import * as bcrypt from 'bcrypt';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class PortalService {
  constructor(private readonly tenantConnService: TenantConnectionService) { }

  private get portalRepository(): Repository<Portal> {
    return this.tenantConnService.getRepository(Portal);
  }

  async findByEmail(email: string): Promise<Portal | null> {
    return this.portalRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });
  }

  async validateUser(
    emailOrPhone: string,
    password: string,
  ): Promise<Portal | null> {
    // Try to find by email first
    let user = await this.findByEmail(emailOrPhone);

    // If not found by email, try phone number
    if (!user) {
      user = await this.findByPhoneNumber(emailOrPhone);
    }

    // Validate password if user found — return the user so the caller can check .status
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
    return this.portalRepository.findOne({
      where: { phoneNumber },
      relations: ['role', 'role.permissions'],
    });
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

  async findById(id: number): Promise<Portal | null> {
    return this.portalRepository.findOne({ where: { id } });
  }

  async exportUserData(
    userId: number,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.portalRepository.findOne({
      where: { id: userId },
      relations: ['customer', 'deliveryPerson'],
    });
    if (!user) return null;
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      email: user.email,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
      customerId: user.customerId,
      deliveryId: user.deliveryId,
      dateCreated: user.dateCreated,
      dateUpdated: user.dateUpdated,
    };
  }

  async deleteUserData(userId: number): Promise<void> {
    await this.portalRepository.delete(userId);
  }

  async findAllUsers(
    page: number,
    pageSize: number,
    status?: string,
    search?: string,
  ): Promise<{ data: Portal[]; total: number }> {
    const statusFilter = status ? { status: status as Portal['status'] } : {};
    const where = search
      ? [
        { ...statusFilter, phoneNumber: ILike(`%${search}%`) },
        { ...statusFilter, name: ILike(`%${search}%`) },
      ]
      : statusFilter;
    const [data, total] = await this.portalRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { dateCreated: 'DESC' },
    });
    return { data, total };
  }

  async updateStatus(
    id: number,
    status: 'approved' | 'rejected',
  ): Promise<Portal | null> {
    const user = await this.findById(id);
    if (!user) return null;
    user.status = status;
    return this.portalRepository.save(user);
  }
}
