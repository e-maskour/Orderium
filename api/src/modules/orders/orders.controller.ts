import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { FilterOrdersDto } from './dto/filter-orders.dto';

@ApiTags('Orders')
@Controller('orders')
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
      documentNumber: order.orderNumber,
    };
  }

  @Post('filter')
  @ApiOperation({ summary: 'Filter orders (POST method)' })
  @ApiQuery({ name: 'fromPortal', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async filterOrders(
    @Body() filterDto: FilterOrdersDto,
    @Query('fromPortal') fromPortal?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const fromPortalBool =
      fromPortal !== undefined ? fromPortal === 'true' : undefined;
    const startDateObj = filterDto.startDate
      ? new Date(filterDto.startDate)
      : undefined;
    const endDateObj = filterDto.endDate
      ? new Date(filterDto.endDate)
      : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    // Allowed page sizes with fallback to 50
    const allowedPageSizes = [10, 50, 100, 500, 1000];
    const pageSizeNum = perPage ? parseInt(perPage, 10) : 50;
    const pageSize = allowedPageSizes.includes(pageSizeNum) ? pageSizeNum : 50;

    const result = await this.ordersService.filterOrders(
      startDateObj,
      endDateObj,
      filterDto.deliveryStatus,
      filterDto.orderNumber,
      filterDto.customerId,
      filterDto.deliveryPersonId,
      fromPortalBool,
      filterDto.fromClient,
      pageNum,
      pageSize,
    );

    return {
      success: true,
      orders: result.orders,
      count: result.count,
      totalCount: result.totalCount,
      statusCounts: result.statusCounts,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with filtering' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fromPortal', required: false, type: Boolean })
  @ApiQuery({ name: 'deliveryStatus', required: false, type: String })
  @ApiQuery({ name: 'fromClient', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(
    @Query('limit') limit?: string,
    @Query('fromPortal') fromPortal?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('fromClient') fromClient?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const fromPortalBool =
      fromPortal !== undefined ? fromPortal === 'true' : undefined;
    const fromClientBool =
      fromClient !== undefined ? fromClient === 'true' : undefined;
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    const result = await this.ordersService.getAllOrders(
      limitNum,
      fromPortalBool,
      deliveryStatus,
      fromClientBool,
      startDateObj,
      endDateObj,
    );
    return {
      success: true,
      orders: result.orders,
      count: result.count,
      statusCounts: result.statusCounts,
    };
  }

  @Get('search/order-numbers')
  @ApiOperation({ summary: 'Search order numbers for autocomplete' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Order numbers retrieved successfully',
  })
  async searchOrderNumbers(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 50;
    const orderNumbers = await this.ordersService.getOrderNumbers(
      search,
      limitNum,
    );

    return {
      success: true,
      data: orderNumbers.map((num: string) => ({
        value: num,
        label: num,
      })),
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
    if (order.customerId !== customerIdNum) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      order,
    };
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer orders with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'orderNumber', required: false, type: String })
  @ApiQuery({ name: 'deliveryStatus', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Customer orders retrieved successfully with pagination',
  })
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('orderNumber') orderNumber?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    
    const result = await this.ordersService.getCustomerOrders(
      customerId,
      pageNum,
      pageSizeNum,
      orderNumber,
      deliveryStatus,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('analytics/data')
  @ApiOperation({ summary: 'Get order analytics with chart data and KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Order analytics retrieved successfully',
  })
  async getAnalytics(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.ordersService.getAnalytics(yearNum);
    return {
      success: true,
      data: analytics,
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

  @Put(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update a validated order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: Partial<CreateOrderDto>,
  ) {
    const order = await this.ordersService.updateOrder(id, updateOrderDto);
    return {
      success: true,
      order,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ordersService.remove(id);
    return {
      success: true,
      message: 'Order deleted successfully',
    };
  }

  @Put(':id/validate')
  @ApiOperation({
    summary: 'Validate an order (change from draft to validated)',
  })
  @ApiResponse({ status: 200, description: 'Order validated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.validate(id);
    return {
      success: true,
      order,
    };
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate an order (change back to draft)' })
  @ApiResponse({ status: 200, description: 'Order devalidated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.devalidate(id);
    return {
      success: true,
      order,
    };
  }

  @Put(':id/deliver')
  @ApiOperation({ summary: 'Mark an order as delivered' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as delivered successfully',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async deliver(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.deliver(id);
    return {
      success: true,
      order,
    };
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.cancel(id);
    return {
      success: true,
      order,
    };
  }

  @Put(':id/mark-invoiced')
  @ApiOperation({ summary: 'Mark an order as invoiced after conversion' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as invoiced successfully',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async markAsInvoiced(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { invoiceId: number },
  ) {
    const order = await this.ordersService.markAsInvoiced(id, body.invoiceId);
    return {
      success: true,
      order,
    };
  }
}
