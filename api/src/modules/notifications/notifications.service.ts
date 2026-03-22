import { Injectable } from '@nestjs/common';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
  ) { }

  private get notificationRepository(): Repository<Notification> {
    return this.tenantConnService.getRepository(Notification);
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: number, limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      take: limit,
      order: { dateCreated: 'DESC' },
    });
  }

  async findAll(filters: {
    userId?: number;
    type?: string | string[];
    priority?: string | string[];
    isRead?: boolean;
    isArchived?: boolean;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      userId,
      type,
      priority,
      isRead,
      isArchived,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 25,
      sortBy = 'dateCreated',
      sortOrder = 'DESC',
    } = filters;

    const where: FindOptionsWhere<Notification> = {};

    if (userId) where.userId = userId;
    if (isRead !== undefined) where.isRead = isRead;
    if (isArchived !== undefined) where.isArchived = isArchived;
    if (type) {
      where.type = Array.isArray(type) ? In(type) : type;
    }
    if (priority) {
      where.priority = Array.isArray(priority) ? In(priority) : priority;
    }

    const queryBuilder =
      this.notificationRepository.createQueryBuilder('notification');

    Object.entries(where).forEach(([key, value]) => {
      if (value && typeof value === 'object' && '_type' in value) {
        // Handle In() operator
        queryBuilder.andWhere(`notification.${key} IN (:...${key})`, {
          [key]: (value as any).value,
        });
      } else {
        queryBuilder.andWhere(`notification.${key} = :${key}`, {
          [key]: value,
        });
      }
    });

    if (search) {
      queryBuilder.andWhere(
        '(notification.title ILIKE :search OR notification.message ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dateFrom) {
      queryBuilder.andWhere('notification.dateCreated >= :dateFrom', {
        dateFrom,
      });
    }

    if (dateTo) {
      queryBuilder.andWhere('notification.dateCreated <= :dateTo', { dateTo });
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy(`notification.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async getStats(userId?: number): Promise<{
    total: number;
    unread: number;
    today: number;
    thisWeek: number;
  }> {
    const where: FindOptionsWhere<Notification> = userId ? { userId } : {};

    const total = await this.notificationRepository.count({ where });
    const unread = await this.notificationRepository.count({
      where: { ...where, isRead: false, isArchived: false },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.notificationRepository
      .createQueryBuilder('notification')
      .where(userId ? 'notification.userId = :userId' : '1=1', { userId })
      .andWhere('notification.dateCreated >= :today', { today })
      .getCount();

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const thisWeekCount = await this.notificationRepository
      .createQueryBuilder('notification')
      .where(userId ? 'notification.userId = :userId' : '1=1', { userId })
      .andWhere('notification.dateCreated >= :weekAgo', { weekAgo })
      .getCount();

    return {
      total,
      unread,
      today: todayCount,
      thisWeek: thisWeekCount,
    };
  }

  async markAsRead(id: number): Promise<Notification> {
    await this.notificationRepository.update(id, { isRead: true });
    const notification = await this.findOne(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async markManyAsRead(ids: number[]): Promise<number> {
    const result = await this.notificationRepository.update(
      { id: In(ids) },
      { isRead: true },
    );
    return result.affected || 0;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return result.affected || 0;
  }

  async archive(id: number): Promise<Notification> {
    await this.notificationRepository.update(id, { isArchived: true });
    const notification = await this.findOne(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async archiveMany(ids: number[]): Promise<number> {
    const result = await this.notificationRepository.update(
      { id: In(ids) },
      { isArchived: true },
    );
    return result.affected || 0;
  }

  async delete(id: number): Promise<void> {
    await this.notificationRepository.delete(id);
  }

  async deleteMany(ids: number[]): Promise<number> {
    const result = await this.notificationRepository.delete({ id: In(ids) });
    return result.affected || 0;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false, isArchived: false },
    });
  }
}
