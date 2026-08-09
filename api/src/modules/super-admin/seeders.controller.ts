import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SeedersService } from './seeders.service';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { SEED } from '../../common/response-codes';
import {
  RunPendingSeedersDto,
  RunSeederDto,
  SeederLogsFilterDto,
} from './dto/seeder.dto';

@ApiTags('Super Admin - Seeders')
@ApiSecurity('X-Super-Admin-Key')
@UseGuards(SuperAdminGuard)
@Public()
@Controller('super-admin/seeders')
export class SeedersController {
  private readonly logger = new Logger(SeedersController.name);

  constructor(private readonly seedersService: SeedersService) {}

  // Static segments are declared before `:tenantId` so they are not swallowed
  // by the numeric param route.

  @Get('catalogue')
  @ApiOperation({
    summary: 'List every known seeder with the options it accepts',
  })
  @ApiResponse({ status: 200, description: 'Seeder catalogue retrieved' })
  getCatalogue() {
    return ApiRes(SEED.CATALOGUE, this.seedersService.getCatalogue());
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get seeder execution logs (last 50 by default)' })
  @ApiResponse({ status: 200, description: 'Logs retrieved' })
  async getLogs(@Query() filter: SeederLogsFilterDto) {
    const data = await this.seedersService.getLogs(filter);
    return ApiRes(SEED.LOGS, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get seeder drift status for all tenants' })
  @ApiResponse({ status: 200, description: 'Status retrieved for all tenants' })
  async getAllStatus() {
    const data = await this.seedersService.getAllTenantsStatus();
    return ApiRes(SEED.ALL_STATUS, data);
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get seeder drift status for one tenant' })
  @ApiResponse({ status: 200, description: 'Tenant seeder status retrieved' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantStatus(@Param('tenantId', ParseIntPipe) tenantId: number) {
    const data = await this.seedersService.getTenantStatusById(tenantId);
    return ApiRes(SEED.TENANT_STATUS, data);
  }

  @Post('run-fleet/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run one seeder against every tenant' })
  @ApiResponse({ status: 200, description: 'Seeder run across all tenants' })
  @ApiResponse({
    status: 400,
    description: 'Seeder is privileged and must be run per tenant',
  })
  @ApiResponse({ status: 404, description: 'Unknown seeder' })
  async runFleet(@Param('key') key: string, @Body() body: RunSeederDto) {
    this.logger.log(`Super admin triggered fleet run of seeder "${key}"`);
    const data = await this.seedersService.runSeederAcrossTenants(
      key,
      body.options ?? {},
    );
    return ApiRes(SEED.RUN_FLEET, data);
  }

  @Post(':tenantId/run-pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run every pending seeder for one tenant. Privileged seeders are skipped ' +
      'unless options are supplied for them.',
  })
  @ApiResponse({ status: 200, description: 'Pending seeders run' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async runPending(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() body: RunPendingSeedersDto,
  ) {
    this.logger.log(
      `Super admin triggered pending seeders for tenant #${tenantId}`,
    );
    const data = await this.seedersService.runPendingForTenant(
      tenantId,
      body.optionsByKey ?? {},
    );
    return ApiRes(SEED.RUN_TENANT, data);
  }

  @Post(':tenantId/run/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run one seeder against one tenant' })
  @ApiResponse({ status: 200, description: 'Seeder run successfully' })
  @ApiResponse({
    status: 400,
    description: 'Required option missing or invalid',
  })
  @ApiResponse({ status: 404, description: 'Tenant or seeder not found' })
  async runForTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('key') key: string,
    @Body() body: RunSeederDto,
  ) {
    this.logger.log(
      `Super admin triggered seeder "${key}" for tenant #${tenantId}`,
    );
    const data = await this.seedersService.runSeederForTenant(
      tenantId,
      key,
      body.options ?? {},
    );
    return ApiRes(SEED.RUN, data);
  }
}
