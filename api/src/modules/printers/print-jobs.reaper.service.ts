import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { TenantService } from '../tenant/tenant.service';
import { tenantStorage } from '../tenant/tenant.context';
import { PrintJob } from './entities/print-job.entity';

/** How long an agent may hold a job before we assume it died. */
export const CLAIM_TIMEOUT_SECONDS = 60;

/** How long a job may wait for an agent before it is no longer worth printing. */
export const STALE_QUEUE_MINUTES = 15;

export interface SweepResult {
  requeued: number;
  failed: number;
  expired: number;
}

/**
 * Recovers jobs abandoned by a dead or disconnected agent.
 *
 * The load-bearing rule: a job that died while `claimed` never reached the
 * device and is safe to requeue, while a job that died while `printing` may
 * have physically printed and must never be retried automatically. Handing a
 * customer a second receipt is worse than handing them none, and it unbalances
 * the till.
 */
@Injectable()
export class PrintJobsReaper {
  private readonly logger = new Logger(PrintJobsReaper.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly tenantService: TenantService,
  ) {}

  private get jobs() {
    return this.tenantConnService.getRepository(PrintJob);
  }

  private async run(sql: string): Promise<number> {
    const result: unknown = await this.jobs.query(sql);
    // Postgres drivers return either [rows, affected] or just rows.
    return Array.isArray(result) && typeof result[1] === 'number'
      ? (result[1] as number)
      : 0;
  }

  async sweep(): Promise<SweepResult> {
    const claimTimeout = `now() - interval '${CLAIM_TIMEOUT_SECONDS} seconds'`;
    const staleAfter = `now() - interval '${STALE_QUEUE_MINUTES} minutes'`;

    // 1. Claimed but never started: bytes never left the API, safe to requeue.
    const requeued = await this.run(`
      UPDATE print_jobs
         SET status = 'queued', agent_id = NULL, claimed_at = NULL
       WHERE status = 'claimed'
         AND claimed_at < ${claimTimeout}
         AND attempts < max_attempts
    `);

    // 2. Claimed and out of attempts: stop trying.
    const exhausted = await this.run(`
      UPDATE print_jobs
         SET status = 'failed',
             completed_at = now(),
             error_message = 'agent did not respond'
       WHERE status = 'claimed'
         AND claimed_at < ${claimTimeout}
         AND attempts >= max_attempts
    `);

    // 3. Printing: may have physically printed. Never auto-retry.
    const abandoned = await this.run(`
      UPDATE print_jobs
         SET status = 'failed',
             completed_at = now(),
             error_message = 'agent lost while printing; may have printed - retry manually'
       WHERE status = 'printing'
         AND claimed_at < ${claimTimeout}
    `);

    // 4. Queued too long: an agent reconnecting tomorrow must not print
    //    yesterday's receipts.
    const expired = await this.run(`
      UPDATE print_jobs
         SET status = 'cancelled',
             completed_at = now(),
             error_message = 'expired before an agent came online'
       WHERE status = 'queued'
         AND queued_at < ${staleAfter}
    `);

    return { requeued, failed: exhausted + abandoned, expired };
  }

  @Cron(CronExpression.EVERY_30_SECONDS, { name: 'print-jobs-reaper' })
  async reap(): Promise<void> {
    let tenants: Array<{ slug: string; id: number; name: string }>;
    try {
      tenants = await this.tenantService.getActiveTenantSlugs();
    } catch (err) {
      this.logger.error(`Could not list tenants: ${(err as Error).message}`);
      return;
    }

    for (const { slug, id, name } of tenants) {
      try {
        await this.tenantConnService.getConnection(slug);
        await tenantStorage.run(
          { tenantSlug: slug, tenantId: id, tenantName: name },
          async () => {
            const { requeued, failed, expired } = await this.sweep();
            if (requeued || failed || expired) {
              this.logger.log(
                `[${slug}] reaped print jobs — requeued ${requeued}, failed ${failed}, expired ${expired}`,
              );
            }
          },
        );
      } catch (err) {
        this.logger.error(
          `[${slug}] print job sweep failed: ${(err as Error).message}`,
        );
      }
    }
  }
}
