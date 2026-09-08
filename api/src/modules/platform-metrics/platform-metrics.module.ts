import { Module, Logger, OnApplicationShutdown, Inject } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Tenant } from '../tenant/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';
import { TenantDailyMetric } from './entities/tenant-daily-metric.entity';
import { TenantHealthBucket } from './entities/tenant-health-bucket.entity';
import { PlatformMetricsController } from './platform-metrics.controller';
import { PlatformMetricsService } from './platform-metrics.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { UsageTrackerService } from './usage-tracker.service';
import { UsageTrackingInterceptor } from './usage-tracking.interceptor';
import { REDIS_CLIENT } from './platform-metrics.constants';

/**
 * Dedicated Redis client for usage counters.
 *
 * Separate from BullMQ's connection because the requirements differ: this one
 * must fail fast rather than queue commands, since a blocked metrics write
 * would otherwise add latency to every API request.
 *
 * Resolves to `null` when Redis is not configured or cannot be constructed —
 * usage tracking then degrades to a no-op and the rest of the module keeps
 * working off the nightly collector alone.
 */
const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis | null => {
    const logger = new Logger('PlatformMetricsRedis');
    const url = configService.get<string>('REDIS_URL');

    try {
      const client = url
        ? new Redis(url, {
            // Fail fast instead of buffering: metrics must never add latency.
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            lazyConnect: false,
          })
        : new Redis({
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: Number(configService.get('REDIS_PORT') ?? 6379),
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
          });

      // Without a listener, ioredis emits unhandled 'error' events that can
      // take the process down when Redis is briefly unreachable.
      let warned = false;
      client.on('error', (err: Error) => {
        if (!warned) {
          warned = true;
          logger.warn(`Usage tracking Redis unavailable: ${err.message}`);
        }
      });
      client.on('ready', () => {
        warned = false;
      });

      return client;
    } catch (err) {
      logger.warn(
        `Could not create Redis client, usage tracking disabled: ${(err as Error).message}`,
      );
      return null;
    }
  },
};

/**
 * Cross-tenant monitoring and usage analytics for the platform operator.
 *
 * Everything here reads and writes `orderium_master`. Tenant databases are
 * touched only by the nightly collector, one at a time, on its own connections.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature(
      [Tenant, TenantDailyMetric, TenantHealthBucket],
      'master',
    ),
    TenantModule,
  ],
  controllers: [PlatformMetricsController],
  providers: [
    redisProvider,
    PlatformMetricsService,
    MetricsCollectorService,
    UsageTrackerService,
    UsageTrackingInterceptor,
  ],
  exports: [UsageTrackerService, UsageTrackingInterceptor],
})
export class PlatformMetricsModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }
}
