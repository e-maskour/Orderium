import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { DeliveryStatus } from '../orders/entities/order.entity';
import { DeliveryOrderResponseDto } from './dto/delivery-order-response.dto';
import {
  DeliveryPersonResponseDto,
  OrderDeliveryAdminResponseDto,
} from './dto/delivery-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { ApiRes } from '../../common/api-response';
import { DLV } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';

@ApiTags('Delivery')
@Controller('delivery')
@PortalRoute()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login delivery person' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: { PhoneNumber: string; Password: string }) {
    const result = await this.deliveryService.login(
      body.PhoneNumber,
      body.Password,
    );

    return ApiRes(DLV.LOGIN, result);
  }

  @Get('persons')
  @Serialize(DeliveryPersonResponseDto)
  @ApiOperation({ summary: 'Get all delivery persons' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of delivery persons' })
  async getAllDeliveryPersons(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveFilter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const deliveryPersons = await this.deliveryService.getAllDeliveryPersons(
      search,
      isActiveFilter,
    );
    return ApiRes(DLV.PERSONS_LIST, deliveryPersons);
  }

  @Get('persons/:id')
  @Serialize(DeliveryPersonResponseDto)
  @ApiOperation({ summary: 'Get a delivery person by ID' })
  @ApiResponse({ status: 200, description: 'Delivery person details' })
  @ApiResponse({ status: 404, description: 'Delivery person not found' })
  async getDeliveryPersonById(@Param('id', ParseIntPipe) id: number) {
    const deliveryPerson = await this.deliveryService.getDeliveryPersonById(id);
    return ApiRes(DLV.PERSON_DETAIL, deliveryPerson);
  }

  @Post()
  @Serialize(DeliveryPersonResponseDto)
  @ApiOperation({ summary: 'Create a new delivery person' })
  @ApiResponse({
    status: 201,
    description: 'Delivery person created successfully',
  })
  async createDeliveryPerson(@Body() createDto: CreateDeliveryPersonDto) {
    const deliveryPerson =
      await this.deliveryService.createDeliveryPerson(createDto);
    return ApiRes(DLV.PERSON_CREATED, deliveryPerson);
  }

  @Patch(':id')
  @Serialize(DeliveryPersonResponseDto)
  @ApiOperation({ summary: 'Update a delivery person' })
  @ApiResponse({
    status: 200,
    description: 'Delivery person updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Delivery person not found' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a delivery person' })
  @ApiResponse({
    status: 200,
    description: 'Delivery person deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Delivery person not found' })
  async deleteDeliveryPerson(@Param('id', ParseIntPipe) id: number) {
    await this.deliveryService.deleteDeliveryPerson(id);
    return ApiRes(DLV.PERSON_DELETED, null);
  }

  @Get('orders')
  @Serialize(OrderDeliveryAdminResponseDto)
  @ApiOperation({ summary: 'Get all delivery orders' })
  @ApiResponse({ status: 200, description: 'List of delivery orders' })
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
  @ApiResponse({
    status: 200,
    description: 'List of orders for delivery person',
  })
  @ApiResponse({ status: 404, description: 'Delivery person not found' })
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

    const orders = result.orderDeliveries.map((o) =>
      DeliveryOrderResponseDto.fromOrderDelivery(o),
    );

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
  @Serialize(OrderDeliveryAdminResponseDto)
  @ApiOperation({ summary: 'Assign order to delivery person' })
  @ApiResponse({ status: 200, description: 'Order assigned successfully' })
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
  @ApiResponse({ status: 200, description: 'Order unassigned successfully' })
  async unassignOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    await this.deliveryService.unassignOrder(orderId);
    return ApiRes(DLV.UNASSIGNED, null);
  }

  @Put('person/:deliveryPersonId/order/:orderId/status')
  @ApiOperation({ summary: 'Update order delivery status' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  async updateOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number,
    @Body() body: { status: DeliveryStatus },
  ) {
    await this.deliveryService.updateOrderStatus(
      orderId,
      body.status,
      deliveryPersonId,
    );
    return ApiRes(DLV.STATUS_UPDATED, null);
  }
}
