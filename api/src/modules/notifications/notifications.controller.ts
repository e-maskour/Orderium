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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { Notification } from './entities/notification.entity';
import {
  RegisterDeviceTokenDto,
  UnregisterDeviceTokenDto,
} from './dto/device-token.dto';
import { ApiRes } from '../../common/api-response';
import { NOT } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@PortalRoute()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
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
  ) {
    const userIdNum = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : undefined;

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

    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 25;
    const offset = (pageNum - 1) * limitNum;
    return ApiRes(NOT.LIST, result.data, {
      limit: limitNum,
      offset,
      total: result.total,
      hasNext: offset + limitNum < result.total,
      hasPrev: offset > 0,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics retrieved successfully',
  })
  async getStats(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const userIdNum = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : undefined;
    const stats = await this.notificationsService.getStats(userIdNum);
    return ApiRes(NOT.STATS, stats);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(
    @Query('userType') userType?: string,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
  ) {
    const userIdNum = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : undefined;

    const count: number =
      await this.notificationsService.getUnreadCount(userIdNum);
    return ApiRes(NOT.UNREAD_COUNT, { count });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved successfully',
  })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ) {
    const limitNum: number = limit ? Number(limit) : 50;
    const notifications = await this.notificationsService.findByUser(
      userId,
      limitNum,
    );
    return ApiRes(NOT.USER_LIST, notifications);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved',
  })
  getPreferences() {
    // Placeholder - implement user preferences later
    return ApiRes(NOT.PREFS_DETAIL, {
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
    });
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated' })
  updatePreferences(@Body() preferences: Record<string, boolean>) {
    // Placeholder - implement user preferences later
    return ApiRes(NOT.PREFS_UPDATED, preferences);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationsService.findOne(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return ApiRes(NOT.DETAIL, notification);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationsService.markAsRead(id);
    return ApiRes(NOT.MARKED_READ, notification);
  }

  @Patch('mark-many-read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markManyAsRead(@Body('ids') ids: number[]) {
    const updated = await this.notificationsService.markManyAsRead(ids);
    return ApiRes(NOT.MARKED_MANY_READ, { updated });
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const userIdNum = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : undefined;
    const updated = await this.notificationsService.markAllAsRead(userIdNum);
    return ApiRes(NOT.MARKED_ALL_READ, { updated });
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive notification' })
  @ApiResponse({ status: 200, description: 'Notification archived' })
  async archive(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationsService.archive(id);
    return ApiRes(NOT.ARCHIVED, notification);
  }

  @Patch('archive-many')
  @ApiOperation({ summary: 'Archive multiple notifications' })
  @ApiResponse({ status: 200, description: 'Notifications archived' })
  async archiveMany(@Body('ids') ids: number[]) {
    const updated = await this.notificationsService.archiveMany(ids);
    return ApiRes(NOT.ARCHIVED_MANY, { updated });
  }

  @Delete('delete-many')
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: 200, description: 'Notifications deleted' })
  async deleteMany(@Body('ids') ids: number[]) {
    const deleted = await this.notificationsService.deleteMany(ids);
    return ApiRes(NOT.DELETED_MANY, { deleted });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.delete(id);
    return ApiRes(NOT.DELETED, null);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
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
    return ApiRes(NOT.TEST_SENT, null);
  }

  // Device Token Endpoints for Push Notifications

  @Post('device-token/:userId')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({ status: 200, description: 'Device token registered' })
  async registerDeviceToken(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    const deviceToken = await this.pushNotificationService.registerDeviceToken(
      userId,
      dto,
    );
    return ApiRes(NOT.TOKEN_REGISTERED, deviceToken);
  }

  @Delete('device-token')
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({ status: 200, description: 'Device token unregistered' })
  async unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto) {
    await this.pushNotificationService.unregisterDeviceToken(dto.token);
    return ApiRes(NOT.TOKEN_UNREGISTERED, null);
  }

  @Get('device-token/:userId')
  @ApiOperation({ summary: 'Get user registered devices' })
  @ApiResponse({ status: 200, description: 'User devices retrieved' })
  async getUserDevices(@Param('userId', ParseIntPipe) userId: number) {
    const devices = await this.pushNotificationService.getUserDevices(userId);
    return ApiRes(NOT.TOKEN_LIST, devices);
  }

  @Patch('device-token/:token/refresh')
  @ApiOperation({ summary: 'Refresh device token last used timestamp' })
  @ApiResponse({ status: 200, description: 'Device token refreshed' })
  async refreshDeviceToken(@Param('token') token: string) {
    await this.pushNotificationService.updateLastUsed(token);
    return ApiRes(NOT.TOKEN_REFRESHED, null);
  }
}
