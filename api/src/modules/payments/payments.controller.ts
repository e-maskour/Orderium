import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { FilterPaymentsDto } from './dto/filter-payments.dto';
import { ApiRes } from '../../common/api-response';
import { PAY } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('Payments')
@Serialize(PaymentResponseDto)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @RequirePermission('payments.create')
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createPaymentDto);
    return ApiRes(PAY.CREATED, payment);
  }

  @Get()
  @ApiOperation({
    summary: 'List payments (filters applied server-side, optional pagination)',
    description:
      'All filters are applied in SQL. metadata.total and metadata.totalAmount ' +
      'reflect the filtered set. Omit page/limit to receive every matching row.',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid filter values' })
  @RequirePermission('payments.view')
  async findAll(@Query() filters: FilterPaymentsDto) {
    const result = await this.paymentsService.findAll(filters);
    const paginated = !!(filters.page || filters.limit);
    const limit = paginated ? (filters.limit ?? 25) : result.total;
    const offset = paginated ? ((filters.page ?? 1) - 1) * limit : 0;
    return ApiRes(PAY.LIST, result.payments, {
      limit,
      offset,
      total: result.total,
      hasNext: paginated
        ? offset + result.payments.length < result.total
        : false,
      hasPrev: offset > 0,
      totalAmount: result.totalAmount,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @RequirePermission('payments.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const payment = await this.paymentsService.findOne(id);
    return ApiRes(PAY.DETAIL, payment);
  }

  @Get('invoice/:invoiceId/total')
  @ApiOperation({ summary: 'Get total paid for an invoice' })
  @ApiResponse({ status: 200, description: 'Total paid retrieved' })
  @RequirePermission('payments.view')
  async getTotalPaid(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    const totalPaid = await this.paymentsService.getTotalPaid(invoiceId);
    return ApiRes(PAY.TOTAL_PAID, totalPaid);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({ status: 200, description: 'Payment updated' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @RequirePermission('payments.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    const payment = await this.paymentsService.update(id, updatePaymentDto);
    return ApiRes(PAY.UPDATED, payment);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Payment deleted' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @RequirePermission('payments.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.paymentsService.remove(id);
    return ApiRes(PAY.DELETED, null);
  }
}
