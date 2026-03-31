import { Injectable, Inject } from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Portal } from './entities/portal.entity';
import * as bcrypt from 'bcrypt';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

/** Cache TTL for portal user lookups — 2 minutes (short, since status can change) */
const PORTAL_USER_TTL = 120_000;

@Injectable()
export class PortalService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get portalRepository(): Repository<Portal> {
    return this.tenantConnService.getRepository(Portal);
  }

  private portalUserKey(id: number): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:portal-user:${id}`;
  }

  private async invalidatePortalUserCache(id: number): Promise<void> {
    await this.cacheManager.del(this.portalUserKey(id));
  }

  async findByEmail(email: string): Promise<Portal | null> {
    return this.portalRepository.findOne({
      where: { email },
      relations: ['role'],
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
      relations: ['role'],
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
      const saved = await this.portalRepository.save(portal);
      await this.invalidatePortalUserCache(portal.id);
      return saved;
    }
    return null;
  }

  async findById(id: number): Promise<Portal | null> {
    const key = this.portalUserKey(id);
    const cached = await this.cacheManager.get<Portal>(key);
    if (cached) return cached;

    const user = await this.portalRepository.findOne({ where: { id } });
    if (user) await this.cacheManager.set(key, user, PORTAL_USER_TTL);
    return user;
  }

  async exportUserData(
    userId: number,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.portalRepository.findOne({
      where: { id: userId },
      relations: ['customer'],
    });
    if (!user) return null;
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      email: user.email,
      isCustomer: user.isCustomer,
      customerId: user.customerId,
      dateCreated: user.dateCreated,
      dateUpdated: user.dateUpdated,
    };
  }

  async deleteUserData(userId: number): Promise<void> {
    await this.portalRepository.delete(userId);
    await this.invalidatePortalUserCache(userId);
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
    const saved = await this.portalRepository.save(user);
    await this.invalidatePortalUserCache(id);
    return saved;
  }
}
