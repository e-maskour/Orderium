import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiRes } from '../../common/api-response';
import { SUB } from '../../common/response-codes';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.service';
import { SuperAdminGuard } from './tenant.guard';
import { SubscriptionAdminService } from './subscription-admin.service';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant-subscription.dto';

/** Super-admin: a tenant's plan, add-ons, effective limits, usage and price. */
@ApiTags('Admin - Subscriptions')
@Controller('admin')
@UseGuards(SuperAdminGuard)
@Public()
export class SubscriptionAdminController {
  constructor(private readonly subscriptions: SubscriptionAdminService) {}

  @Get('subscription/addons')
  @ApiOperation({ summary: 'Add-on catalogue (packs and extra features)' })
  @ApiResponse({ status: 200, description: 'Add-on catalogue' })
  addons() {
    return ApiRes(SUB.ADDONS, this.subscriptions.catalogue());
  }

  @Get('tenants/:id/subscription')
  @ApiOperation({ summary: "Tenant's plan, add-ons, limits, usage and price" })
  @ApiResponse({ status: 200, description: 'Tenant subscription' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async get(@Param('id', ParseIntPipe) id: number) {
    return ApiRes(SUB.ADMIN_DETAIL, await this.subscriptions.get(id));
  }

  @Put('tenants/:id/subscription')
  @ApiOperation({
    summary: 'Change plan and/or add-ons; limits become plan + add-ons',
  })
  @ApiResponse({ status: 200, description: 'Tenant subscription updated' })
  @ApiResponse({ status: 404, description: 'Tenant or plan not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantSubscriptionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return ApiRes(
      SUB.ADMIN_UPDATED,
      await this.subscriptions.update(id, dto, admin?.email),
    );
  }
}
