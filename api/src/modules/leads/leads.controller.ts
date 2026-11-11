import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
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
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { SuperAdminGuard } from '../tenant/tenant.guard';
import { ApiRes } from '../../common/api-response';
import { LED } from '../../common/response-codes';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';

/** Landing-page contact form (unauthenticated, rate-limited). */
@ApiTags('Public - Leads')
@Public()
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit the landing page contact form' })
  @ApiResponse({ status: 201, description: 'Lead received' })
  @ApiResponse({ status: 400, description: 'Invalid name or phone' })
  @ApiResponse({ status: 429, description: 'Too many submissions' })
  async create(
    @Body() dto: CreateLeadDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.leads.capture(dto, { ip, userAgent });
    return ApiRes(LED.RECEIVED, { received: true as const });
  }
}

/** Lead follow-up from the tenant dashboard (super admin only). */
@ApiTags('Admin - Leads')
@ApiSecurity('X-Super-Admin-Key')
@UseGuards(SuperAdminGuard)
@Public()
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads (newest first) with counts per status' })
  @ApiResponse({ status: 200, description: 'Leads retrieved' })
  async findAll(@Query() filter: FilterLeadsDto) {
    return ApiRes(LED.LIST, await this.leads.findAll(filter));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead status or notes' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
  ) {
    return ApiRes(LED.UPDATED, await this.leads.update(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead (spam, duplicate…)' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.leads.remove(id);
    return ApiRes(LED.DELETED, null);
  }
}
