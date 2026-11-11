import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderPaymentsService } from './order-payments.service';
import {
  CreateOrderPaymentDto,
  UpdateOrderPaymentDto,
} from './dto/create-order-payment.dto';
import { OrderPaymentResponseDto } from './dto/order-payment-response.dto';
import { CaisseOrderResponseDto } from './dto/caisse-order-response.dto';
import { FilterCaisseDto } from './dto/filter-caisse.dto';
import { ApiRes } from '../../common/api-response';
import { OPAY } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Order Payments')
@Serialize(OrderPaymentResponseDto)
@Controller('order-payments')
export class OrderPaymentsController {
  private readonly logger = new Logger(OrderPaymentsController.name);

  constructor(private readonly orderPaymentsService: OrderPaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a payment for an order' })
  @ApiResponse({ status: 201, description: 'Order payment created' })
  @RequirePermission('payments.create')
  async create(@Body() dto: CreateOrderPaymentDto) {
    const payment = await this.orderPaymentsService.create(dto);
    return ApiRes(OPAY.CREATED, payment);
  }

  @Get('caisse')
  @Serialize(CaisseOrderResponseDto)
  @ApiOperation({
    summary: 'Get caisse summary — orders with payment status',
    description:
      'Search, status and pagination are applied server-side. metadata carries ' +
      'total, per-status counts and summary totals of the filtered set.',
  })
  @ApiResponse({ status: 200, description: 'Caisse summary retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid filter values' })
  @RequirePermission('caisse.view')
  async getCaisseSummary(@Query() filters: FilterCaisseDto) {
    const result = await this.orderPaymentsService.getCaisseSummary(filters);
    const paginated = !!(filters.page || filters.limit);
    const limit = paginated ? (filters.limit ?? 25) : result.total;
    const offset = paginated ? ((filters.page ?? 1) - 1) * limit : 0;
    return ApiRes(OPAY.CAISSE, result.rows, {
      limit,
      offset,
      total: result.total,
      hasNext: paginated ? offset + result.rows.length < result.total : false,
      hasPrev: offset > 0,
      counts: result.counts,
      summary: result.summary,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all order payments' })
  @ApiResponse({ status: 200, description: 'All order payments retrieved' })
  @RequirePermission('payments.view')
  async findAll() {
    const payments = await this.orderPaymentsService.findAll();
    return ApiRes(OPAY.LIST_ALL, payments);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, description: 'Order payments retrieved' })
  @RequirePermission('payments.view')
  async findByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    const payments = await this.orderPaymentsService.findByOrder(orderId);
    return ApiRes(OPAY.LIST, payments);
  }

  @Get('order/:orderId/total')
  @ApiOperation({ summary: 'Get total paid for an order' })
  @ApiResponse({ status: 200, description: 'Total paid retrieved' })
  @RequirePermission('payments.view')
  async getTotalPaid(@Param('orderId', ParseIntPipe) orderId: number) {
    const totalPaid = await this.orderPaymentsService.getTotalPaid(orderId);
    return ApiRes(OPAY.TOTAL_PAID, totalPaid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order payment by ID' })
  @ApiResponse({ status: 200, description: 'Order payment retrieved' })
  @RequirePermission('payments.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const payment = await this.orderPaymentsService.findOne(id);
    return ApiRes(OPAY.DETAIL, payment);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order payment' })
  @ApiResponse({ status: 200, description: 'Order payment updated' })
  @RequirePermission('payments.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderPaymentDto,
  ) {
    const payment = await this.orderPaymentsService.update(id, dto);
    return ApiRes(OPAY.UPDATED, payment);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an order payment' })
  @ApiResponse({ status: 200, description: 'Order payment deleted' })
  @RequirePermission('payments.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.orderPaymentsService.remove(id);
    return ApiRes(OPAY.DELETED, null);
  }
}
