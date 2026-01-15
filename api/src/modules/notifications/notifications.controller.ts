/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  async getNotifications(
    @Query('userType') userType?: string,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; notifications: Notification[] }> {
    // Determine userId from query parameters
    const userIdNum: number = userId
      ? Number(userId)
      : customerId
        ? Number(customerId)
        : 0;

    const limitNum: number = limit ? Number(limit) : 50;
    const notifications = await this.notificationsService.findByUser(
      userIdNum,
      limitNum,
    );
    return { success: true, notifications };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(
    @Query('userType') userType?: string,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
  ): Promise<{ success: boolean; count: number }> {
    // Determine userId from query parameters
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

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.markAsRead(id);
    return { success: true, message: 'Notification marked as read' };
  }

  @Patch('user/:userId/read-all')
  @ApiOperation({ summary: 'Mark all user notifications as read' })
  async markAllAsRead(@Param('userId', ParseIntPipe) userId: number) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true, message: 'All notifications marked as read' };
  }
}
