import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintJobsAgentService } from './print-jobs.agent.service';
import { ReportPrintResultDto } from './dto/report-print-result.dto';
import { ApiRes } from '../../common/api-response';
import { PJB } from '../../common/response-codes';
import { AgentRoute } from '../auth/decorators/agent-route.decorator';
import { AgentAuthGuard } from '../auth/guards/agent-auth.guard';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../auth/decorators/current-agent.decorator';
import { NoPermissionRequired } from '../auth/decorators/permissions.decorator';

/**
 * Endpoints a print agent calls. Authenticated by agent key, not JWT.
 *
 * Paths put the verb before the id (`claim/:id`, not `:id/claim`) so they can
 * never be shadowed by `GET /print-jobs/:id` on the operator controller,
 * whichever order Nest registers them in.
 */
@ApiTags('Print Jobs (Agent)')
@AgentRoute()
@NoPermissionRequired()
@UseGuards(AgentAuthGuard)
@Controller('print-jobs')
export class PrintJobsAgentController {
  constructor(private readonly service: PrintJobsAgentService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Queued jobs for this agent’s warehouse (the polling sweep)',
  })
  @ApiResponse({ status: 200, description: 'Pending jobs retrieved' })
  async pending(@CurrentAgent() agent: AuthenticatedAgent) {
    return ApiRes(PJB.PENDING, await this.service.pending(agent));
  }

  @Post('claim/:id')
  @ApiOperation({ summary: 'Take ownership of a queued job' })
  @ApiResponse({ status: 200, description: 'Job claimed' })
  @ApiResponse({ status: 409, description: 'Another agent claimed it first' })
  async claim(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    return ApiRes(PJB.CLAIMED, await this.service.claim(id, agent));
  }

  @Get('payload/:id')
  @ApiOperation({
    summary: 'Bytes to send to the device; moves the job to printing',
  })
  @ApiResponse({ status: 200, description: 'Payload ready' })
  @ApiResponse({ status: 403, description: 'Job is held by another agent' })
  async payload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    return ApiRes(PJB.PAYLOAD, await this.service.payload(id, agent));
  }

  @Post('result/:id')
  @ApiOperation({ summary: 'Report the outcome of a print' })
  @ApiResponse({ status: 200, description: 'Result recorded' })
  @ApiResponse({ status: 403, description: 'Job is held by another agent' })
  async report(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportPrintResultDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.service.report(id, agent, dto);
    return ApiRes(PJB.REPORTED, null);
  }
}
