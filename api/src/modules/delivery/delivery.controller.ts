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
import { JwtService } from '@nestjs/jwt';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { DLV } from '../../common/response-codes';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login delivery person' })
  async login(@Body() body: { PhoneNumber: string; Password: string }) {
    const deliveryPerson = await this.deliveryService.login(
      body.PhoneNumber,
      body.Password,
    );

    // Return without password
    const { password, ...personData } = deliveryPerson;

    const token = this.jwtService.sign({
      sub: personData.id,
      phoneNumber: personData.phoneNumber,
      isAdmin: false,
      isCustomer: false,
      isDelivery: true,
    });

    return ApiRes(DLV.LOGIN, {
      deliveryPerson: {
        Id: personData.id,
        Name: personData.name,
        PhoneNumber: personData.phoneNumber,
        Email: personData.email,
      },
      token,
    });
  }

  @Get('persons')
  @ApiOperation({ summary: 'Get all delivery persons' })
  async getAllDeliveryPersons() {
    const deliveryPersons = await this.deliveryService.getAllDeliveryPersons();
    return ApiRes(DLV.PERSONS_LIST, deliveryPersons);
  }

  @Get('persons/:id')
  @ApiOperation({ summary: 'Get a delivery person by ID' })
  async getDeliveryPersonById(@Param('id', ParseIntPipe) id: number) {
    const deliveryPerson = await this.deliveryService.getDeliveryPersonById(id);
    return ApiRes(DLV.PERSON_DETAIL, deliveryPerson);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new delivery person' })
  async createDeliveryPerson(@Body() createDto: CreateDeliveryPersonDto) {
    const deliveryPerson =
      await this.deliveryService.createDeliveryPerson(createDto);
    return ApiRes(DLV.PERSON_CREATED, deliveryPerson);
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
    return ApiRes(DLV.PERSON_UPDATED, deliveryPerson);
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
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '100', 10) || 100),
    );
    const orders = await this.deliveryService.getOrderDeliveries(limitNum);
    return ApiRes(DLV.ORDERS_LIST, orders);
  }

  @Post('person/:id/orders')
  @ApiOperation({ summary: 'Get orders for a delivery person' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getDeliveryPersonOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Body()
    filters?: {
      orderNumber?: string;
      customerName?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const pageSizeNum = Math.min(
      100,
      Math.max(1, parseInt(pageSize ?? '50', 10) || 50),
    );

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
    const orders = result.orderDeliveries.map((od) => ({
      orderId: od.order.id,
      orderNumber: od.order.orderNumber,
      customerName: od.order.customer?.name || 'N/A',
      customerPhone: od.order.customer?.phoneNumber || 'N/A',
      customerAddress:
        od.order.customer?.deliveryAddress || od.order.customer?.address,
      latitude: od.order.customer?.latitude,
      longitude: od.order.customer?.longitude,
      googleMapsUrl: od.order.customer?.googleMapsUrl,
      wazeUrl:
        od.order.customer?.wazeUrl ||
        (od.order.customer?.latitude && od.order.customer?.longitude
          ? `https://waze.com/ul?ll=${od.order.customer.latitude},${od.order.customer.longitude}&navigate=yes`
          : undefined),
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
      items: od.order.items?.map((item) => ({
        productName: item.product?.name || 'Unknown Product',
        quantity: Number(item.quantity),
        price: Number(item.unitPrice),
      })),
    }));

    const offset = (pageNum - 1) * pageSizeNum;
    return ApiRes(DLV.PERSON_ORDERS, orders, {
      limit: pageSizeNum,
      offset,
      total: result.total,
      hasNext: pageNum < Math.ceil(result.total / pageSizeNum),
      hasPrev: pageNum > 1,
    });
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
    return ApiRes(DLV.ASSIGNED, orderDelivery);
  }

  @Post('unassign/:orderId')
  @ApiOperation({ summary: 'Unassign order from delivery person' })
  async unassignOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    await this.deliveryService.unassignOrder(orderId);
    return ApiRes(DLV.UNASSIGNED, null);
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
    return ApiRes(DLV.STATUS_UPDATED, null);
  }
}
