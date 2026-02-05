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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

  @Post('person/:id/orders')
  @ApiOperation({ summary: 'Get orders for a delivery person' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getDeliveryPersonOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Body() filters?: {
      orderNumber?: string;
      customerName?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;
    
    const result = await this.deliveryService.getDeliveryPersonOrders(
      id,
      pageNum,
      pageSizeNum,
      filters?.orderNumber,
      filters?.customerName,
      filters?.startDate ? new Date(filters.startDate) : undefined,
      filters?.endDate ? new Date(filters.endDate) : undefined,
    );
    
    // Transform OrderDelivery to match frontend Order interface
    const orders = result.orderDeliveries.map(od => ({
      orderId: od.order.id,
      orderNumber: od.order.orderNumber,
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
      totalAmount: Number(od.order.total),
      status: od.status,
      pendingAt: od.pendingAt?.toISOString(),
      assignedAt: od.assignedAt?.toISOString(),
      confirmedAt: od.confirmedAt?.toISOString(),
      pickedUpAt: od.pickedUpAt?.toISOString(),
      toDeliveryAt: od.toDeliveryAt?.toISOString(),
      inDeliveryAt: od.inDeliveryAt?.toISOString(),
      deliveredAt: od.deliveredAt?.toISOString(),
      canceledAt: od.canceledAt?.toISOString(),
      createdAt: od.order.dateCreated.toISOString(),
      items: od.order.items?.map(item => ({
        productName: item.product?.name || 'Unknown Product',
        quantity: Number(item.quantity),
        price: Number(item.unitPrice),
      })),
    }));
    
    return { 
      success: true, 
      orders,
      total: result.total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(result.total / pageSizeNum),
    };
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

  @Put('person/:deliveryPersonId/order/:orderId/status')
  @ApiOperation({ summary: 'Update order delivery status' })
  async updateOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number,
    @Body() body: { status: string },
  ) {
    await this.deliveryService.updateOrderStatus(
      orderId,
      body.status as any,
      deliveryPersonId,
    );
    return { success: true };
  }
}
