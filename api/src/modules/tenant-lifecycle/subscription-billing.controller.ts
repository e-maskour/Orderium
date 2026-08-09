import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionBillingService } from './subscription-billing.service';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  VoidPaymentDto,
  ListPaymentsDto,
  CreateInstallmentDto,
  UpdateInstallmentDto,
  ValidateInstallmentDto,
  RejectInstallmentDto,
} from './dto/payment.dto';

/**
 * Subscription billing for the super-admin console.
 *
 * `payments` are obligations (what a tenant owes for a period);
 * `installments` are the tranches that settle them.
 *
 * Authorisation is the same static-key model as the rest of the admin
 * surface: SuperAdminGuard checks `X-Super-Admin-Key` on every route, and
 * `@Public()` only means "outside the tenant JWT flow" — never unguarded.
 * There is no tenant-scoped principal here; the sole caller is the platform
 * operator, who is entitled to see every tenant's billing.
 */
@ApiTags('Subscription Billing')
@Controller()
@UseGuards(SuperAdminGuard)
@Public()
export class SubscriptionBillingController {
  constructor(private readonly billing: SubscriptionBillingService) {}

  // ─── Obligations ───────────────────────────────────────────────────────────

  @Get('admin/payments')
  @ApiOperation({
    summary: 'List payment obligations across all tenants (paginated)',
  })
  @ApiResponse({ status: 200, description: 'Paginated payments' })
  list(@Query() dto: ListPaymentsDto) {
    return this.billing.list(dto);
  }

  @Get('admin/payments/summary')
  @ApiOperation({ summary: 'Billing totals, grouped by currency' })
  @ApiResponse({ status: 200, description: 'Per-currency summary rows' })
  summary(@Query() dto: ListPaymentsDto) {
    return this.billing.summary(dto);
  }

  @Get('admin/payments/:id')
  @ApiOperation({ summary: 'Get a payment with its installments' })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.findOne(id);
  }

  @Get('admin/tenants/:id/payments')
  @ApiOperation({ summary: 'List a tenant payment history' })
  @ApiResponse({ status: 200, description: 'Payments for the tenant' })
  listForTenant(@Param('id', ParseIntPipe) id: number) {
    return this.billing.listForTenant(id);
  }

  @Post('admin/tenants/:id/payments')
  @ApiOperation({ summary: 'Create a payment obligation for a tenant' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.create(id, dto, performedBy);
  }

  @Patch('admin/payments/:id')
  @ApiOperation({ summary: 'Update a payment obligation' })
  @ApiResponse({ status: 200, description: 'Payment updated' })
  @ApiResponse({
    status: 400,
    description: 'amountDue below the amount already collected',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.update(id, dto, performedBy);
  }

  @Post('admin/payments/:id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a payment obligation' })
  @ApiResponse({ status: 200, description: 'Payment voided' })
  @ApiResponse({ status: 409, description: 'Money already collected' })
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidPaymentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.void(id, dto, performedBy);
  }

  @Delete('admin/payments/:id')
  @ApiOperation({ summary: 'Delete a payment that has no installments' })
  @ApiResponse({ status: 200, description: 'Payment deleted' })
  @ApiResponse({ status: 409, description: 'Installments exist' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.remove(id, performedBy);
  }

  // ─── Tranches ──────────────────────────────────────────────────────────────

  @Get('admin/payments/:id/installments')
  @ApiOperation({ summary: 'List the tranches recorded against a payment' })
  @ApiResponse({ status: 200, description: 'Installments' })
  listInstallments(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.listInstallments(id);
  }

  @Post('admin/payments/:id/installments')
  @ApiOperation({ summary: 'Record a tranche (partial payment)' })
  @ApiResponse({ status: 201, description: 'Installment recorded' })
  @ApiResponse({ status: 400, description: 'Amount exceeds remaining balance' })
  addInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInstallmentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.addInstallment(id, dto, performedBy);
  }

  @Patch('admin/installments/:id')
  @ApiOperation({ summary: 'Update a tranche' })
  @ApiResponse({ status: 200, description: 'Installment updated' })
  updateInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstallmentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.updateInstallment(id, dto, performedBy);
  }

  @Post('admin/installments/:id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a tranche so it counts toward the balance',
  })
  @ApiResponse({ status: 200, description: 'Installment validated' })
  @ApiResponse({ status: 400, description: 'Would exceed remaining balance' })
  validateInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateInstallmentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.validateInstallment(id, dto, performedBy);
  }

  @Post('admin/installments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending tranche' })
  @ApiResponse({ status: 200, description: 'Installment rejected' })
  rejectInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectInstallmentDto,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.rejectInstallment(id, dto, performedBy);
  }

  @Post('admin/installments/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a validated tranche' })
  @ApiResponse({ status: 200, description: 'Installment refunded' })
  refundInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.refundInstallment(id, performedBy);
  }

  @Delete('admin/installments/:id')
  @ApiOperation({ summary: 'Delete a tranche' })
  @ApiResponse({ status: 200, description: 'Installment deleted' })
  removeInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('performedBy') performedBy?: string,
  ) {
    return this.billing.removeInstallment(id, performedBy);
  }
}
