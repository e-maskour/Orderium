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
import { ApiRes } from '../../common/api-response';
import { PAY } from '../../common/response-codes';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createPaymentDto);
    return ApiRes(PAY.CREATED, payment);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments or payments by invoice' })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async findAll(
    @Query('invoiceId', new ParseIntPipe({ optional: true }))
    invoiceId?: number,
  ) {
    const payments = invoiceId
      ? await this.paymentsService.findByInvoice(invoiceId)
      : await this.paymentsService.findAll();
    return ApiRes(PAY.LIST, payments);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const payment = await this.paymentsService.findOne(id);
    return ApiRes(PAY.DETAIL, payment);
  }

  @Get('invoice/:invoiceId/total')
  @ApiOperation({ summary: 'Get total paid for an invoice' })
  @ApiResponse({ status: 200, description: 'Total paid retrieved' })
  async getTotalPaid(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    const totalPaid = await this.paymentsService.getTotalPaid(invoiceId);
    return ApiRes(PAY.TOTAL_PAID, totalPaid);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({ status: 200, description: 'Payment updated' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.paymentsService.remove(id);
    return ApiRes(PAY.DELETED, null);
  }
}
