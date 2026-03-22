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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
    ChangeStatusDto,
    ExtendTrialDto,
    ArchiveTenantDto,
    DeleteTenantDto,
    CreatePaymentDto,
    ValidatePaymentDto,
    RejectPaymentDto,
    UpdatePlanDto,
} from './dto/lifecycle.dto';

@ApiTags('Tenant Lifecycle')
@Controller()
@UseGuards(SuperAdminGuard)
@Public()
export class TenantLifecycleController {
    constructor(private readonly lifecycleService: TenantLifecycleService) { }

    // ─── Status management ─────────────────────────────────────────────────────

    @Post('admin/tenants/:id/activate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Activate tenant' })
    @ApiResponse({ status: 200, description: 'Tenant activated' })
    activate(
        @Param('id', ParseIntPipe) id: number,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.activate(id, performedBy);
    }

    @Post('admin/tenants/:id/disable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable tenant' })
    @ApiResponse({ status: 200, description: 'Tenant disabled' })
    disable(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeStatusDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.disable(id, dto.reason ?? '', performedBy);
    }

    @Post('admin/tenants/:id/suspend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Suspend tenant' })
    @ApiResponse({ status: 200, description: 'Tenant suspended' })
    suspend(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeStatusDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.suspend(id, dto.reason ?? '', performedBy);
    }

    @Post('admin/tenants/:id/archive')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Archive tenant' })
    @ApiResponse({ status: 200, description: 'Tenant archived' })
    archive(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ArchiveTenantDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.archive(id, dto.confirmation, dto.reason, performedBy);
    }

    @Post('admin/tenants/:id/unarchive')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Unarchive tenant' })
    @ApiResponse({ status: 200, description: 'Tenant unarchived' })
    unarchive(
        @Param('id', ParseIntPipe) id: number,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.unarchive(id, performedBy);
    }

    @Delete('admin/tenants/:id/permanent')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Permanently delete tenant' })
    @ApiResponse({ status: 200, description: 'Tenant deleted permanently' })
    deletePermanently(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeleteTenantDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.deletePermanently(id, dto.confirmation, performedBy);
    }

    @Post('admin/tenants/:id/extend-trial')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Extend trial period' })
    @ApiResponse({ status: 200, description: 'Trial extended' })
    extendTrial(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ExtendTrialDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.extendTrial(id, dto.additionalDays, performedBy);
    }

    // ─── Activity log ──────────────────────────────────────────────────────────

    @Get('admin/tenants/:id/activity')
    @ApiOperation({ summary: 'Get tenant activity log' })
    @ApiResponse({ status: 200, description: 'Activity log' })
    getActivity(@Param('id', ParseIntPipe) id: number) {
        return this.lifecycleService.getActivityLog(id);
    }

    // ─── Payments per tenant ───────────────────────────────────────────────────

    @Post('admin/tenants/:id/payments')
    @ApiOperation({ summary: 'Create payment for tenant' })
    @ApiResponse({ status: 201, description: 'Payment created' })
    createPayment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreatePaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.createPayment(id, dto, performedBy);
    }

    @Get('admin/tenants/:id/payments')
    @ApiOperation({ summary: 'List tenant payments' })
    @ApiResponse({ status: 200, description: 'List of payments' })
    listPayments(@Param('id', ParseIntPipe) id: number) {
        return this.lifecycleService.listPayments(id);
    }

    // ─── Global payments ───────────────────────────────────────────────────────

    @Get('admin/payments')
    @ApiOperation({ summary: 'List all payments' })
    @ApiResponse({ status: 200, description: 'List of all payments' })
    listAllPayments(
        @Query('status') status?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.lifecycleService.listAllPayments({ status, from, to });
    }

    @Post('admin/payments/:id/validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate payment' })
    @ApiResponse({ status: 200, description: 'Payment validated' })
    validatePayment(
        @Param('id') id: string,
        @Body() dto: ValidatePaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.validatePayment(id, dto, performedBy);
    }

    @Post('admin/payments/:id/reject')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reject payment' })
    @ApiResponse({ status: 200, description: 'Payment rejected' })
    rejectPayment(
        @Param('id') id: string,
        @Body() dto: RejectPaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.rejectPayment(id, dto, performedBy);
    }

    @Post('admin/payments/:id/refund')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refund payment' })
    @ApiResponse({ status: 200, description: 'Payment refunded' })
    refundPayment(
        @Param('id') id: string,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.refundPayment(id, performedBy);
    }

    // ─── Plans ──────────────────────────────────────────────────────────────────

    @Get('admin/plans')
    @ApiOperation({ summary: 'List plans' })
    @ApiResponse({ status: 200, description: 'List of plans' })
    listPlans() {
        return this.lifecycleService.listPlans();
    }

    @Patch('admin/plans/:id')
    @ApiOperation({ summary: 'Update plan' })
    @ApiResponse({ status: 200, description: 'Plan updated' })
    updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
        return this.lifecycleService.updatePlan(id, dto);
    }

    @Delete('admin/plans/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Deactivate plan' })
    @ApiResponse({ status: 200, description: 'Plan deactivated' })
    deactivatePlan(@Param('id') id: string) {
        return this.lifecycleService.deactivatePlan(id);
    }
}
