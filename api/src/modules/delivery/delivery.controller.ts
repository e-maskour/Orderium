import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';

@ApiTags('Delivery')
@Controller('api/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('persons')
  @ApiOperation({ summary: 'Get all delivery persons' })
  async getAllDeliveryPersons() {
    const persons = await this.deliveryService.getAllDeliveryPersons();
    return { success: true, persons };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all delivery orders' })
  async getOrderDeliveries(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const orders = await this.deliveryService.getOrderDeliveries(limitNum);
    return { success: true, orders };
  }

  @Get('person/:id/orders')
  @ApiOperation({ summary: 'Get orders for a delivery person' })
  async getDeliveryPersonOrders(@Param('id', ParseIntPipe) id: number) {
    const orders = await this.deliveryService.getDeliveryPersonOrders(id);
    return { success: true, orders };
  }
}
