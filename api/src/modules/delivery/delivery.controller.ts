/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login delivery person' })
  async login(@Body() body: { PhoneNumber: string; Password: string }) {
    const deliveryPerson = await this.deliveryService.login(
      body.PhoneNumber,
      body.Password,
    );
    
    // Return without password
    const { password, ...personData } = deliveryPerson;
    
    return {
      success: true,
      deliveryPerson: {
        Id: personData.id,
        Name: personData.name,
        PhoneNumber: personData.phoneNumber,
        Email: personData.email,
      },
      token: `delivery-${personData.id}-${Date.now()}`, // Simple token for now
    };
  }

  @Get('persons')
  @ApiOperation({ summary: 'Get all delivery persons' })
  async getAllDeliveryPersons() {
    const deliveryPersons =
      await this.deliveryService.getAllDeliveryPersons();
    return { success: true, deliveryPersons };
  }

  @Get('persons/:id')
  @ApiOperation({ summary: 'Get a delivery person by ID' })
  async getDeliveryPersonById(@Param('id', ParseIntPipe) id: number) {
    const deliveryPerson = await this.deliveryService.getDeliveryPersonById(id);
    return { success: true, deliveryPerson };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new delivery person' })
  async createDeliveryPerson(@Body() createDto: CreateDeliveryPersonDto) {
    const deliveryPerson =
      await this.deliveryService.createDeliveryPerson(createDto);
    return { success: true, deliveryPerson };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a delivery person' })
  async updateDeliveryPerson(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeliveryPersonDto,
  ) {
    const deliveryPerson = await this.deliveryService.updateDeliveryPerson(
      id,
      updateDto,
    );
    return { success: true, deliveryPerson };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a delivery person' })
  async deleteDeliveryPerson(@Param('id', ParseIntPipe) id: number) {
    await this.deliveryService.deleteDeliveryPerson(id);
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
    const orderDeliveries = await this.deliveryService.getDeliveryPersonOrders(id);
    
    // Transform OrderDelivery to match frontend Order interface
    const orders = orderDeliveries.map(od => ({
      orderId: od.order.id,
      orderNumber: od.order.orderNumber || od.order.number,
      customerName: od.order.customer?.name || 'N/A',
      customerPhone: od.order.customer?.phoneNumber || 'N/A',
      customerAddress: od.order.customer?.deliveryAddress || od.order.customer?.address,
      latitude: od.order.customer?.latitude,
      longitude: od.order.customer?.longitude,
      googleMapsUrl: od.order.customer?.googleMapsUrl,
      wazeUrl: od.order.customer?.wazeUrl || (
        od.order.customer?.latitude && od.order.customer?.longitude 
          ? `https://waze.com/ul?ll=${od.order.customer.latitude},${od.order.customer.longitude}&navigate=yes`
          : undefined
      ),
      totalAmount: od.order.total,
      status: od.status,
      confirmedAt: od.assignedAt?.toISOString(),
      pickedUpAt: od.pickedUpAt?.toISOString(),
      deliveredAt: od.deliveredAt?.toISOString(),
      createdAt: od.order.dateCreated.toISOString(),
      assignedAt: od.assignedAt?.toISOString(),
      items: od.order.items?.map(item => ({
        productName: item.product?.name || 'Unknown Product',
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
    }));
    
    return { success: true, orders };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign order to delivery person' })
  async assignToDelivery(
    @Body() body: { OrderId: number; DeliveryPersonId: number },
  ) {
    const orderDelivery = await this.deliveryService.assignOrderToDelivery(
      body.OrderId,
      body.DeliveryPersonId,
    );
    return { success: true, orderDelivery };
  }

  @Post('unassign/:orderId')
  @ApiOperation({ summary: 'Unassign order from delivery person' })
  async unassignOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    await this.deliveryService.unassignOrder(orderId);
    return { success: true };
  }
}
