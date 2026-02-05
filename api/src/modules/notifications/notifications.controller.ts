/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto/device-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications with filters and pagination' })
  async getNotifications(
    @Query('userType') userType?: string,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: string | string[],
    @Query('priority') priority?: string | string[],
    @Query('isRead') isRead?: string,
    @Query('isArchived') isArchived?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<{ 
    success: boolean; 
    data: Notification[]; 
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const userIdNum = userId ? Number(userId) : customerId ? Number(customerId) : undefined;
    
    const result = await this.notificationsService.findAll({
      userId: userIdNum,
      type,
      priority,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      search,
      dateFrom,
      dateTo,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      sortBy: sortBy || 'dateCreated',
      sortOrder: sortOrder || 'DESC',
    });

    return {
      success: true,
      ...result,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getStats(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
  ): Promise<{ 
    success: boolean; 
    stats: {
      total: number;
      unread: number;
      today: number;
      thisWeek: number;
    };
  }> {
    const userIdNum = userId ? Number(userId) : customerId ? Number(customerId) : undefined;
    const stats = await this.notificationsService.getStats(userIdNum);
    return { success: true, stats };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(
    @Query('userType') userType?: string,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
  ): Promise<{ success: boolean; count: number }> {
    const userIdNum: number = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : 0;

    const count: number = await this.notificationsService.getUnreadCount(
      userIdNum,
    );
    return { success: true, count };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; notifications: Notification[] }> {
    const limitNum: number = limit ? Number(limit) : 50;
    const notifications = await this.notificationsService.findByUser(
      userId,
      limitNum,
    );
    return { success: true, notifications };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  async getNotification(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; notification: Notification }> {
    const notification = await this.notificationsService.findOne(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return { success: true, notification };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationsService.markAsRead(id);
    return { success: true, notification };
  }

  @Patch('mark-many-read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  async markManyAsRead(@Body('ids') ids: number[]) {
    const updated = await this.notificationsService.markManyAsRead(ids);
    return { success: true, updated };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const userIdNum = userId ? Number(userId) : customerId ? Number(customerId) : 0;
    const updated = await this.notificationsService.markAllAsRead(userIdNum);
    return { success: true, updated };
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive notification' })
  async archive(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationsService.archive(id);
    return { success: true, notification };
  }

  @Patch('archive-many')
  @ApiOperation({ summary: 'Archive multiple notifications' })
  async archiveMany(@Body('ids') ids: number[]) {
    const updated = await this.notificationsService.archiveMany(ids);
    return { success: true, updated };
  }

  @Delete('delete-many')
  @ApiOperation({ summary: 'Delete multiple notifications' })
  async deleteMany(@Body('ids') ids: number[]) {
    const deleted = await this.notificationsService.deleteMany(ids);
    return { success: true, deleted };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.delete(id);
    return { success: true, message: 'Notification deleted' };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences() {
    // Placeholder - implement user preferences later
    return {
      success: true,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationTypes: {
          NEW_ORDER: true,
          ORDER_ASSIGNED: true,
          ORDER_COMPLETED: true,
          ORDER_CANCELLED: true,
          PAYMENT_RECEIVED: true,
          DELIVERY_UPDATE: true,
          SYSTEM_ALERT: true,
        },
      },
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Body() preferences: any) {
    // Placeholder - implement user preferences later
    return { success: true, preferences };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification() {
    // Send a test notification
    await this.notificationsService.create({
      userId: 1, // Test user
      type: 'SYSTEM_ALERT',
      priority: 'HIGH',
      title: 'Test Notification',
      message: 'This is a test notification from the system',
      data: { test: true },
    });
    return { success: true, message: 'Test notification sent' };
  }

  // Device Token Endpoints for Push Notifications

  @Post('device-token/:userId')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  async registerDeviceToken(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: RegisterDeviceTokenDto,
  ): Promise<{ success: boolean; deviceToken: DeviceToken }> {
    const deviceToken = await this.pushNotificationService.registerDeviceToken(userId, dto);
    return { success: true, deviceToken };
  }

  @Delete('device-token')
  @ApiOperation({ summary: 'Unregister device token' })
  async unregisterDeviceToken(
    @Body() dto: UnregisterDeviceTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.pushNotificationService.unregisterDeviceToken(dto.token);
    return { success: true, message: 'Device token unregistered' };
  }

  @Get('device-token/:userId')
  @ApiOperation({ summary: 'Get user registered devices' })
  async getUserDevices(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ success: boolean; devices: DeviceToken[] }> {
    const devices = await this.pushNotificationService.getUserDevices(userId);
    return { success: true, devices };
  }

  @Patch('device-token/:token/refresh')
  @ApiOperation({ summary: 'Refresh device token last used timestamp' })
  async refreshDeviceToken(
    @Param('token') token: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.pushNotificationService.updateLastUsed(token);
    return { success: true, message: 'Device token refreshed' };
  }
}
