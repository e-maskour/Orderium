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

@Controller()
@UseGuards(SuperAdminGuard)
@Public()
export class TenantLifecycleController {
    constructor(private readonly lifecycleService: TenantLifecycleService) { }

    // ─── Status management ─────────────────────────────────────────────────────

    @Post('admin/tenants/:id/activate')
    @HttpCode(HttpStatus.OK)
    activate(
        @Param('id', ParseIntPipe) id: number,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.activate(id, performedBy);
    }

    @Post('admin/tenants/:id/disable')
    @HttpCode(HttpStatus.OK)
    disable(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeStatusDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.disable(id, dto.reason ?? '', performedBy);
    }

    @Post('admin/tenants/:id/suspend')
    @HttpCode(HttpStatus.OK)
    suspend(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeStatusDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.suspend(id, dto.reason ?? '', performedBy);
    }

    @Post('admin/tenants/:id/archive')
    @HttpCode(HttpStatus.OK)
    archive(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ArchiveTenantDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.archive(id, dto.confirmation, dto.reason, performedBy);
    }

    @Post('admin/tenants/:id/unarchive')
    @HttpCode(HttpStatus.OK)
    unarchive(
        @Param('id', ParseIntPipe) id: number,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.unarchive(id, performedBy);
    }

    @Delete('admin/tenants/:id/permanent')
    @HttpCode(HttpStatus.OK)
    deletePermanently(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeleteTenantDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.deletePermanently(id, dto.confirmation, performedBy);
    }

    @Post('admin/tenants/:id/extend-trial')
    @HttpCode(HttpStatus.OK)
    extendTrial(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ExtendTrialDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.extendTrial(id, dto.additionalDays, performedBy);
    }

    // ─── Activity log ──────────────────────────────────────────────────────────

    @Get('admin/tenants/:id/activity')
    getActivity(@Param('id', ParseIntPipe) id: number) {
        return this.lifecycleService.getActivityLog(id);
    }

    // ─── Payments per tenant ───────────────────────────────────────────────────

    @Post('admin/tenants/:id/payments')
    createPayment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreatePaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.createPayment(id, dto, performedBy);
    }

    @Get('admin/tenants/:id/payments')
    listPayments(@Param('id', ParseIntPipe) id: number) {
        return this.lifecycleService.listPayments(id);
    }

    // ─── Global payments ───────────────────────────────────────────────────────

    @Get('admin/payments')
    listAllPayments(
        @Query('status') status?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.lifecycleService.listAllPayments({ status, from, to });
    }

    @Post('admin/payments/:id/validate')
    @HttpCode(HttpStatus.OK)
    validatePayment(
        @Param('id') id: string,
        @Body() dto: ValidatePaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.validatePayment(id, dto, performedBy);
    }

    @Post('admin/payments/:id/reject')
    @HttpCode(HttpStatus.OK)
    rejectPayment(
        @Param('id') id: string,
        @Body() dto: RejectPaymentDto,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.rejectPayment(id, dto, performedBy);
    }

    @Post('admin/payments/:id/refund')
    @HttpCode(HttpStatus.OK)
    refundPayment(
        @Param('id') id: string,
        @Body('performedBy') performedBy?: string,
    ) {
        return this.lifecycleService.refundPayment(id, performedBy);
    }

    // ─── Plans ──────────────────────────────────────────────────────────────────

    @Get('admin/plans')
    listPlans() {
        return this.lifecycleService.listPlans();
    }

    @Patch('admin/plans/:id')
    updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
        return this.lifecycleService.updatePlan(id, dto);
    }

    @Delete('admin/plans/:id')
    @HttpCode(HttpStatus.OK)
    deactivatePlan(@Param('id') id: string) {
        return this.lifecycleService.deactivatePlan(id);
    }
}
