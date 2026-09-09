import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

export interface PrintNotification {
  warehouseId: number;
  jobId: string;
}

/**
 * Wakes an agent when a job is queued for its warehouse.
 *
 * This is an optimisation, never the correctness guarantee: agents also sweep
 * `GET /print-jobs/pending` on reconnect and on a timer, so a dropped
 * notification degrades latency rather than losing the job.
 *
 * Task 10 adds Redis fan-out so a notification reaches whichever API instance
 * holds the agent's SSE connection. Today it is in-process.
 */
@Injectable()
export class PrintNotifier {
  private readonly logger = new Logger(PrintNotifier.name);
  private readonly subject = new Subject<PrintNotification>();

  notify(warehouseId: number, jobId: string): void {
    this.logger.debug(`Notifying warehouse ${warehouseId} of job ${jobId}`);
    this.subject.next({ warehouseId, jobId });
  }

  stream(warehouseId: number): Observable<{ jobId: string }> {
    return this.subject.asObservable().pipe(
      filter((n) => n.warehouseId === warehouseId),
      map((n) => ({ jobId: n.jobId })),
    );
  }
}
