import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Observable, Subject, filter, map } from 'rxjs';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

export interface PrintNotification {
  channel: string;
  jobId: string;
}

/** Notifications are namespaced by tenant and warehouse. */
export function printChannel(tenantSlug: string, warehouseId: number): string {
  return `print:${tenantSlug}:${warehouseId}`;
}

const CHANNEL_PATTERN = 'print:*';

/**
 * Wakes the agent holding an SSE connection for a warehouse.
 *
 * Fan-out goes through Redis because the agent's connection may live on a
 * different API instance from the request that queued the job.
 *
 * This is an optimisation, never the correctness guarantee: agents also sweep
 * GET /print-jobs/pending on reconnect and on a timer, so a dropped
 * notification costs latency rather than the job. If Redis is unavailable the
 * notifier degrades to in-process delivery, which is still correct for a
 * single instance.
 */
@Injectable()
export class PrintNotifier implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrintNotifier.name);
  private readonly subject = new Subject<PrintNotification>();

  private publisher?: Redis;
  private subscriber?: Redis;

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configService: ConfigService,
  ) {}

  private redisOptions(): { host: string; port: number; password?: string } {
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) return { host: 'localhost', port: 6379 };
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        ...(parsed.password
          ? { password: decodeURIComponent(parsed.password) }
          : {}),
      };
    } catch {
      return { host: 'localhost', port: 6379 };
    }
  }

  onModuleInit(): void {
    const options = this.redisOptions();
    try {
      this.publisher = new Redis({ ...options, lazyConnect: false });
      // A subscribed client cannot issue other commands, so it needs its own.
      this.subscriber = new Redis({ ...options, lazyConnect: false });

      this.publisher.on('error', (e) =>
        this.logger.warn(`Redis publisher error: ${e.message}`),
      );
      this.subscriber.on('error', (e) =>
        this.logger.warn(`Redis subscriber error: ${e.message}`),
      );

      void this.subscriber.psubscribe(CHANNEL_PATTERN);
      this.subscriber.on('pmessage', (_pattern, channel, message) =>
        this.handleMessage(channel, message),
      );
    } catch (e) {
      this.logger.warn(
        `Redis unavailable, print notifications stay in-process: ${(e as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.publisher?.quit(), this.subscriber?.quit()]);
  }

  /** Exposed so delivery can be tested without a Redis server. */
  handleMessage(channel: string, message: string): void {
    try {
      const { jobId } = JSON.parse(message) as { jobId: string };
      if (jobId) this.subject.next({ channel, jobId });
    } catch {
      this.logger.warn(`Ignoring malformed print notification on ${channel}`);
    }
  }

  notify(warehouseId: number, jobId: string): void {
    const channel = printChannel(
      this.tenantConnService.getCurrentTenantSlug(),
      warehouseId,
    );
    const message = JSON.stringify({ jobId });

    if (this.publisher) {
      this.publisher.publish(channel, message).catch((e: Error) =>
        this.logger.warn(`Failed to publish to ${channel}: ${e.message}`),
      );
    } else {
      // No Redis: deliver locally so single-instance deployments still work.
      this.handleMessage(channel, message);
    }
  }

  /**
   * The tenant slug is resolved once, at subscribe time, while the request
   * context still exists — messages arrive long after it is gone.
   */
  stream(warehouseId: number): Observable<{ jobId: string }> {
    const channel = printChannel(
      this.tenantConnService.getCurrentTenantSlug(),
      warehouseId,
    );

    return this.subject.asObservable().pipe(
      filter((n) => n.channel === channel),
      map((n) => ({ jobId: n.jobId })),
    );
  }
}
