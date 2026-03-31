import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiSecurity,
} from '@nestjs/swagger';
import { MigrationsService } from './migrations.service';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { MGMT } from '../../common/response-codes';

@ApiTags('Super Admin - Migrations')
@ApiSecurity('X-Super-Admin-Key')
@UseGuards(SuperAdminGuard)
@Public()
@Controller('super-admin/migrations')
export class MigrationsController {
    private readonly logger = new Logger(MigrationsController.name);

    constructor(private readonly migrationsService: MigrationsService) { }

    @Get()
    @ApiOperation({ summary: 'Get migration status for all tenants' })
    @ApiResponse({ status: 200, description: 'Migration status retrieved for all tenants' })
    async getAllStatus() {
        const data = await this.migrationsService.getAllTenantsStatus();
        return ApiRes(MGMT.ALL_STATUS, data);
    }

    @Get('logs')
    @ApiOperation({ summary: 'Get migration execution logs (last 50 by default)' })
    @ApiResponse({ status: 200, description: 'Logs retrieved' })
    async getLogs(
        @Query('limit') limit?: string,
        @Query('tenantId') tenantId?: string,
        @Query('status') status?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const data = await this.migrationsService.getLogs({
            limit: limit ? parseInt(limit, 10) : 50,
            tenantId: tenantId ? parseInt(tenantId, 10) : undefined,
            status,
            from,
            to,
        });
        return ApiRes(MGMT.LOGS, data);
    }

    @Get(':tenantId')
    @ApiOperation({ summary: 'Get migration status for a specific tenant' })
    @ApiResponse({ status: 200, description: 'Migration status retrieved' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async getTenantStatus(@Param('tenantId', ParseIntPipe) tenantId: number) {
        const data = await this.migrationsService.getTenantMigrationStatusById(tenantId);
        return ApiRes(MGMT.TENANT_STATUS, data);
    }

    @Post('run-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Run pending migrations for ALL tenants' })
    @ApiResponse({ status: 200, description: 'Migrations run for all tenants' })
    async runAll() {
        this.logger.log('Super admin triggered run-all migrations');
        const data = await this.migrationsService.runMigrationsForAllTenants();
        return ApiRes(MGMT.RUN_ALL, data);
    }

    @Post(':tenantId/run')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Run pending migrations for a specific tenant' })
    @ApiResponse({ status: 200, description: 'Migrations run successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async runForTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
        this.logger.log(`Super admin triggered migration run for tenant #${tenantId}`);
        const data = await this.migrationsService.runMigrationsForTenant(tenantId);
        return ApiRes(MGMT.RUN, data);
    }

    @Post(':tenantId/revert')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revert the last applied migration for a specific tenant' })
    @ApiResponse({ status: 200, description: 'Last migration reverted' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async revertForTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
        this.logger.log(`Super admin triggered migration revert for tenant #${tenantId}`);
        const data = await this.migrationsService.revertLastMigrationForTenant(tenantId);
        return ApiRes(MGMT.REVERT, data);
    }
}
