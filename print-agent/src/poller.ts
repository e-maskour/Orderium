import type { ApiClient } from './api-client';
import type { AgentConfig } from './config';
import type { JobRunner } from './job-runner';
import { log } from './logger';

export const SWEEP_INTERVAL_MS = 30_000;

/**
 * The correctness guarantee.
 *
 * SSE reduces latency, but a dropped notification must never lose a job, so
 * the agent sweeps unconditionally on a timer as well. If the stream dies or
 * Redis blips, printing degrades to at most SWEEP_INTERVAL_MS of latency
 * rather than stopping.
 */
export class Poller {
  private timer?: NodeJS.Timeout;
  private sweeping = false;
  private stopped = false;

  constructor(
    private readonly api: ApiClient,
    private readonly runner: JobRunner,
    private readonly opts: { sweepIntervalMs?: number } = {},
  ) {}

  async sweep(): Promise<number> {
    // One shop, one printer: overlapping sweeps would interleave receipts.
    if (this.sweeping) return 0;
    this.sweeping = true;

    try {
      const jobs = await this.api.pending();
      let printed = 0;

      for (const job of jobs) {
        if (this.stopped) break;
        try {
          if ((await this.runner.handle(job.id)) === 'printed') printed++;
        } catch (err) {
          // One bad job must not abandon the rest of the queue.
          log.error(`Unexpected error on job ${job.id}: ${(err as Error).message}`);
        }
      }

      return printed;
    } catch (err) {
      log.warn(`Sweep failed: ${(err as Error).message}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }

  start(): void {
    this.stopped = false;
    void this.sweep();
    this.timer = setInterval(
      () => void this.sweep(),
      this.opts.sweepIntervalMs ?? SWEEP_INTERVAL_MS,
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    // Let the job in hand finish rather than cutting a receipt in half.
    while (this.sweeping) await new Promise((r) => setTimeout(r, 20));
  }
}
