import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FilterOrdersDto } from './dto/filter-orders.dto';
import { ApiRes } from '../../common/api-response';
import { ORD } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Orders')
@PortalRoute()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(createOrderDto);
    return ApiRes(ORD.CREATED, order);
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
    @Query('direction') direction?: string,
  ) {
    const fromPortalBool =
      fromPortal !== undefined ? fromPortal === 'true' : undefined;
    const directionValue =
      direction?.toUpperCase() === 'ACHAT'
        ? 'ACHAT'
        : direction?.toUpperCase() === 'VENTE'
          ? 'VENTE'
          : undefined;
    const startDateObj = filterDto.startDate
      ? new Date(filterDto.startDate)
      : undefined;
    const endDateObj = filterDto.endDate
      ? new Date(filterDto.endDate)
      : undefined;
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    // Allowed page sizes capped at 100 for standard queries
    const allowedPageSizes = [10, 50, 100];
    const parsedPerPage = perPage ? parseInt(perPage, 10) || 50 : 50;
    const pageSize = allowedPageSizes.includes(parsedPerPage) ? parsedPerPage : 50;

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
      filterDto.supplierId,
      directionValue,
      filterDto.status,
      filterDto.search,
    );

    const offset = (pageNum - 1) * pageSize;
    return ApiRes(ORD.FILTERED, result.orders, {
      limit: pageSize,
      offset,
      total: result.totalCount,
      hasNext: offset + pageSize < result.totalCount,
      hasPrev: offset > 0,
      statusCounts: result.statusCounts,
      orderStatusCounts: result.orderStatusCounts,
    });
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
    @Query('direction') direction?: string,
  ) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '50', 10) || 50),
    );
    const fromPortalBool =
      fromPortal !== undefined ? fromPortal === 'true' : undefined;
    const fromClientBool =
      fromClient !== undefined ? fromClient === 'true' : undefined;
    const directionValue =
      direction?.toUpperCase() === 'ACHAT'
        ? 'ACHAT'
        : direction?.toUpperCase() === 'VENTE'
          ? 'VENTE'
          : undefined;
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    const result = await this.ordersService.getAllOrders(
      limitNum,
      fromPortalBool,
      deliveryStatus,
      fromClientBool,
      startDateObj,
      endDateObj,
      directionValue,
    );
    return ApiRes(ORD.LIST, result.orders, {
      limit: limitNum,
      offset: 0,
      total: result.count,
      hasNext: false,
      hasPrev: false,
      statusCounts: result.statusCounts,
    });
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

    return ApiRes(
      ORD.SEARCH_NUMBERS,
      orderNumbers.map((o) => ({
        value: o.id,
        label: o.documentNumber,
        customerId: o.customerId,
      })),
    );
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get order by order number' })
  @ApiQuery({ name: 'customerId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
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

    return ApiRes(ORD.BY_NUMBER, order);
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
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const pageSizeNum = Math.min(
      100,
      Math.max(1, parseInt(pageSize ?? '10', 10) || 10),
    );

    const result = await this.ordersService.getCustomerOrders(
      customerId,
      pageNum,
      pageSizeNum,
      orderNumber,
      deliveryStatus,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    const offset = (pageNum - 1) * pageSizeNum;
    return ApiRes(ORD.CUSTOMER_ORDERS, result.orders, {
      limit: pageSizeNum,
      offset,
      total: result.total,
      hasNext: pageNum < result.totalPages,
      hasPrev: pageNum > 1,
    });
  }

  @Get('analytics/:direction')
  @ApiOperation({ summary: 'Get order analytics with chart data and KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Order analytics retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid direction parameter' })
  async getAnalytics(
    @Param('direction') direction: 'vente' | 'achat',
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.ordersService.getAnalytics(direction, yearNum);
    return ApiRes(ORD.ANALYTICS, analytics);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.getOrderById(id);
    return ApiRes(ORD.DETAIL, order);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update a validated order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: Partial<CreateOrderDto>,
  ) {
    const order = await this.ordersService.updateOrder(id, updateOrderDto);
    return ApiRes(ORD.UPDATED, order);
  }

  @Patch(':id/update-validated')
  @ApiOperation({ summary: 'Update an order even if validated — devalidates, updates and re-validates in one transaction' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateValidated(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: Partial<CreateOrderDto>,
  ) {
    const order = await this.ordersService.updateValidatedOrder(id, updateOrderDto);
    return ApiRes(ORD.UPDATE_VALIDATED, order);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ordersService.remove(id);
    return ApiRes(ORD.DELETED, null);
  }

  @Put(':id/validate')
  @ApiOperation({
    summary: 'Validate an order (change from draft to validated)',
  })
  @ApiResponse({ status: 200, description: 'Order validated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.validate(id);
    return ApiRes(ORD.VALIDATED, order);
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate an order (change back to draft)' })
  @ApiResponse({ status: 200, description: 'Order devalidated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.devalidate(id);
    return ApiRes(ORD.DEVALIDATED, order);
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
    return ApiRes(ORD.DELIVERED, order);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.cancel(id);
    return ApiRes(ORD.CANCELLED, order);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change order status via workflow (confirmed → picked_up | delivered | cancelled)' })
  @ApiResponse({ status: 200, description: 'Order status changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    const order = await this.ordersService.changeOrderStatus(id, body.status);
    return ApiRes(ORD.STATUS_CHANGED, order);
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
    return ApiRes(ORD.MARKED_INVOICED, order);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generate a shareable public link for an order' })
  @ApiResponse({ status: 200, description: 'Share link generated' })
  async generateShareLink(@Param('id', ParseIntPipe) id: number) {
    const result = await this.ordersService.generateShareLink(id);
    return ApiRes(ORD.SHARED, result);
  }

  @Public()
  @Get('shared/:token')
  @ApiOperation({ summary: 'Get order by share token (public, no auth required)' })
  @ApiResponse({ status: 200, description: 'Order retrieved' })
  async getByShareToken(@Param('token') token: string) {
    const order = await this.ordersService.getByShareToken(token);
    return ApiRes(ORD.SHARED_DETAIL, order);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke share link for an order' })
  @ApiResponse({ status: 200, description: 'Share link revoked' })
  async revokeShareLink(@Param('id', ParseIntPipe) id: number) {
    await this.ordersService.revokeShareLink(id);
    return ApiRes(ORD.SHARE_REVOKED, null);
  }

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary: "Export orders (bon de livraison / bon d'achat) to XLSX file",
  })
  async exportToXlsx(
    @Query('supplierId') supplierId?: string,
    @Res() res?: Response,
  ) {
    const supplierIdNum = supplierId ? parseInt(supplierId, 10) : undefined;
    const buffer = await this.ordersService.exportToXlsx(supplierIdNum);

    const filename =
      supplierIdNum !== undefined
        ? supplierIdNum
          ? 'bons-achat.xlsx'
          : 'bons-livraison.xlsx'
        : 'bons.xlsx';

    if (res) {
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    }
  }
}
