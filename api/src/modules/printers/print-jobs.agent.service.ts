import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PDFService } from '../pdf/pdf.service';
import { PrintJob } from './entities/print-job.entity';
import { Printer } from './entities/printer.entity';
import { ReceiptDataService } from './receipt-data.service';
import { renderEscPos } from './escpos/escpos.renderer';
import type { AuthenticatedAgent } from '../auth/decorators/current-agent.decorator';
import type { ReportPrintResultDto } from './dto/report-print-result.dto';

export interface PrintPayload {
  kind: 'escpos' | 'pdf';
  dataBase64: string;
  fileName?: string;
}

/** Our document types mapped onto the PDF module's vocabulary. */
const PDF_DOCUMENT_TYPE: Record<string, 'invoice' | 'quote' | 'delivery-note' | 'receipt'> = {
  receipt: 'receipt',
  pos: 'receipt',
  bl: 'delivery-note',
  bon_commande: 'delivery-note',
  devis: 'quote',
};

@Injectable()
export class PrintJobsAgentService {
  private readonly logger = new Logger(PrintJobsAgentService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly receiptData: ReceiptDataService,
    private readonly pdfService: PDFService,
  ) {}

  private get jobs(): Repository<PrintJob> {
    return this.tenantConnService.getRepository(PrintJob);
  }

  private get printers(): Repository<Printer> {
    return this.tenantConnService.getRepository(Printer);
  }

  /**
   * Takes ownership of a job.
   *
   * A single conditional UPDATE is what makes this race-proof: two agents
   * cannot both move a job out of 'queued', so a receipt is never printed
   * twice. Losing the race is a clean 409, not an error condition.
   */
  async claim(jobId: string, agent: AuthenticatedAgent): Promise<PrintJob> {
    const result: unknown = await this.jobs.query(
      `UPDATE print_jobs
          SET status = 'claimed',
              agent_id = $1,
              claimed_at = now(),
              attempts = attempts + 1
        WHERE id = $2
          AND warehouse_id = $3
          AND status = 'queued'
        RETURNING *`,
      [agent.id, jobId, agent.warehouseId],
    );

    // Postgres drivers differ: some return the rows array, others [rows, count].
    const rows = (Array.isArray((result as unknown[])[0])
      ? (result as unknown[][])[0]
      : result) as PrintJob[];

    if (!rows?.length) {
      throw new ConflictException('Job is not queued, or another agent claimed it');
    }
    return rows[0];
  }

  private async ownedJob(jobId: string, agent: AuthenticatedAgent): Promise<PrintJob> {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Print job not found');
    if (job.agentId !== agent.id || job.warehouseId !== agent.warehouseId) {
      throw new ForbiddenException('This job is held by another agent');
    }
    return job;
  }

  /**
   * Returns the bytes to send to the device, and moves the job to 'printing'.
   *
   * After this point the job is never auto-retried: the agent may have already
   * written to the printer, and a duplicate receipt is worse than a missing one.
   */
  async payload(jobId: string, agent: AuthenticatedAgent): Promise<PrintPayload> {
    const job = await this.ownedJob(jobId, agent);

    const printer = await this.printers.findOne({ where: { id: job.printerId! } });
    if (!printer) throw new NotFoundException('Printer not found');

    let payload: PrintPayload;

    if (printer.kind === 'thermal') {
      const data = await this.receiptData.build(job.documentRef!);
      payload = {
        kind: 'escpos',
        dataBase64: renderEscPos(data, {
          paperWidth: printer.paperWidth,
          brand: printer.brand,
        }).toString('base64'),
      };
    } else {
      const pdfType = PDF_DOCUMENT_TYPE[job.documentType];
      if (!pdfType) {
        throw new NotFoundException(
          `Document type "${job.documentType}" cannot be printed as a document`,
        );
      }
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        pdfType,
        job.documentRef!,
      );
      payload = {
        kind: 'pdf',
        dataBase64: pdfBuffer.toString('base64'),
        fileName,
      };
    }

    await this.jobs.update({ id: job.id }, { status: 'printing' });
    return payload;
  }

  async report(
    jobId: string,
    agent: AuthenticatedAgent,
    dto: ReportPrintResultDto,
  ): Promise<void> {
    const job = await this.ownedJob(jobId, agent);

    await this.jobs.save({
      ...job,
      status: dto.status,
      durationMs: dto.durationMs,
      errorMessage: dto.error ?? null,
      completedAt: new Date(),
    });

    this.logger.log(
      `Job ${jobId} reported ${dto.status} by agent ${agent.id}` +
        (dto.error ? `: ${dto.error}` : ''),
    );
  }

  /**
   * The polling sweep. Push notification is an optimisation; this is the
   * correctness guarantee when a notification is dropped.
   */
  async pending(agent: AuthenticatedAgent): Promise<PrintJob[]> {
    return this.jobs.find({
      where: { warehouseId: agent.warehouseId, status: 'queued' },
      order: { queuedAt: 'ASC' },
      take: 20,
    });
  }
}
