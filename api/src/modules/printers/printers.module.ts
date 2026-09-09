import { Module } from '@nestjs/common';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { PrintJobsController } from './print-jobs.controller';
import { PrintJobsService } from './print-jobs.service';
import { PrintJobsAgentController } from './print-jobs.agent.controller';
import { PrintJobsAgentService } from './print-jobs.agent.service';
import { PrintJobsDispatchService } from './print-jobs.dispatch.service';
import { PrintJobsReaper } from './print-jobs.reaper.service';
import { PrintAgentsController } from './print-agents.controller';
import { PrintAgentsService } from './print-agents.service';
import { PrintNotifier } from './print-notifier.service';
import { ReceiptDataService } from './receipt-data.service';
import { TenantModule } from '../tenant/tenant.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { PDFModule } from '../pdf/pdf.module';

@Module({
  imports: [TenantModule, ConfigurationsModule, PDFModule],
  controllers: [
    PrintersController,
    PrintJobsController,
    // Registered after PrintJobsController; agent paths put the verb first
    // (claim/:id) so ordering cannot shadow GET /print-jobs/:id either way.
    PrintJobsAgentController,
    PrintAgentsController,
  ],
  providers: [
    PrintersService,
    PrintJobsService,
    PrintJobsDispatchService,
    PrintJobsAgentService,
    PrintJobsReaper,
    PrintAgentsService,
    PrintNotifier,
    ReceiptDataService,
  ],
  exports: [PrintersService, PrintJobsDispatchService],
})
export class PrintersModule {}
