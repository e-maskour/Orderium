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
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';
import { ApiRes } from '../../common/api-response';
import { PAY } from '../../common/response-codes';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createPaymentDto);
    return ApiRes(PAY.CREATED, payment);
  }

  @Get()
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const payment = await this.paymentsService.findOne(id);
    return ApiRes(PAY.DETAIL, payment);
  }

  @Get('invoice/:invoiceId/total')
  async getTotalPaid(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    const totalPaid = await this.paymentsService.getTotalPaid(invoiceId);
    return ApiRes(PAY.TOTAL_PAID, totalPaid);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    const payment = await this.paymentsService.update(id, updatePaymentDto);
    return ApiRes(PAY.UPDATED, payment);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.paymentsService.remove(id);
    return ApiRes(PAY.DELETED, null);
  }
}
