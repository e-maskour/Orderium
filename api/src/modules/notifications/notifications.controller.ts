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

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
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
