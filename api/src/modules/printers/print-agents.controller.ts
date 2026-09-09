import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintAgentsService } from './print-agents.service';
import { CreatePrintAgentDto } from './dto/create-print-agent.dto';
import { PairAgentDto } from './dto/pair-agent.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { ApiRes } from '../../common/api-response';
import { PAG } from '../../common/response-codes';
import { AgentRoute } from '../auth/decorators/agent-route.decorator';
import { AgentAuthGuard } from '../auth/guards/agent-auth.guard';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../auth/decorators/current-agent.decorator';
import {
  RequirePermission,
  NoPermissionRequired,
} from '../auth/decorators/permissions.decorator';

/**
 * Backoffice-only, except `pair`.
 *
 * Deliberately NOT marked @PortalRoute(): customers and delivery staff never
 * manage print agents. Only the backoffice does.
 */
@ApiTags('Print Agents')
@Controller('print-agents')
export class PrintAgentsController {
  constructor(private readonly service: PrintAgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List print agents with their online state' })
  @ApiResponse({ status: 200, description: 'Print agents retrieved' })
  @RequirePermission('printers.view')
  async list() {
    return ApiRes(PAG.LIST, await this.service.list());
  }

  @Post()
  @ApiOperation({ summary: 'Create a print agent and issue a pairing code' })
  @ApiResponse({ status: 201, description: 'Print agent created' })
  @RequirePermission('printers.create')
  async create(@Body() dto: CreatePrintAgentDto) {
    return ApiRes(PAG.CREATED, await this.service.create(dto));
  }

  /**
   * Exchanges a pairing code for a permanent key.
   *
   * @AgentRoute() only tells the global JwtAuthGuard to stand aside — an agent
   * has no key yet at this point, so AgentAuthGuard must NOT be applied here.
   * The pairing code is the credential, which is why this route is throttled.
   */
  @Post('pair')
  @AgentRoute()
  @NoPermissionRequired()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a pairing code for a permanent agent key' })
  @ApiResponse({ status: 200, description: 'Print agent paired' })
  @ApiResponse({ status: 401, description: 'Invalid or expired pairing code' })
  async pair(@Body() dto: PairAgentDto) {
    return ApiRes(PAG.PAIRED, await this.service.pair(dto.pairingCode));
  }

  /**
   * Liveness ping, every 30s. Unlike `pair`, this one IS behind
   * AgentAuthGuard — the agent has a key by now.
   */
  @Post('heartbeat')
  @AgentRoute()
  @NoPermissionRequired()
  @UseGuards(AgentAuthGuard)
  @ApiOperation({ summary: 'Report agent liveness and printer reachability' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async heartbeat(
    @Body() dto: HeartbeatDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.service.heartbeat(agent, dto);
    return ApiRes(PAG.HEARTBEAT, null);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a print agent' })
  @ApiResponse({ status: 200, description: 'Print agent revoked' })
  @ApiResponse({ status: 404, description: 'Print agent not found' })
  @RequirePermission('printers.delete')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.revoke(id);
    return ApiRes(PAG.REVOKED, null);
  }
}
