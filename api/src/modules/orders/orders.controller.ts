import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(createOrderDto);
    return {
      success: true,
      order,
      documentNumber: order.Document.number,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const orders = await this.ordersService.getAllOrders(limitNum);
    return {
      success: true,
      orders,
      count: orders.length,
    };
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get order by order number' })
  @ApiQuery({ name: 'customerId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findByNumber(
    @Param('orderNumber') orderNumber: string,
    @Query('customerId') customerId?: string,
  ) {
    const customerIdNum = customerId ? parseInt(customerId, 10) : null;

    if (!customerIdNum || isNaN(customerIdNum)) {
      throw new BadRequestException('Customer ID is required');
    }

    const order = await this.ordersService.getOrderByNumber(orderNumber);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to customer
    if (order.Document.customerId !== customerIdNum) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      order,
    };
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer orders' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Customer orders retrieved successfully',
  })
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const orders = await this.ordersService.getCustomerOrders(
      customerId,
      limitNum,
    );
    return {
      success: true,
      orders,
      count: orders.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.getOrderById(id);
    return {
      success: true,
      order,
    };
  }
}
