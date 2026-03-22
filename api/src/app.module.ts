import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import KeyvRedis from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import configuration
import envConfig from './config/env.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import defaultsConfig from './config/defaults.config';

// Import modules
import { ProductsModule } from './modules/products/products.module';
import { PartnersModule } from './modules/partners/partners.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { PortalModule } from './modules/portal/portal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ConfigurationsModule } from './modules/configurations/configurations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PDFModule } from './modules/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { HealthModule } from './modules/health/health.module';
import { DriveModule } from './modules/drive/drive.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

// Multi-tenancy
import { TenantModule, TenantMiddleware } from './modules/tenant/tenant.module';
import { TenantLifecycleModule } from './modules/tenant-lifecycle/tenant-lifecycle.module';
import { Tenant } from './modules/tenant/tenant.entity';
import { Payment } from './modules/tenant-lifecycle/entities/payment.entity';
import { SubscriptionPlan } from './modules/tenant-lifecycle/entities/subscription-plan.entity';
import { TenantActivityLog } from './modules/tenant-lifecycle/entities/tenant-activity-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, databaseConfig, jwtConfig, defaultsConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 60, // 60 requests per minute per IP
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        return {
          ttl: 300_000,
          max: 100,
          ...(redisUrl ? { stores: [new KeyvRedis(redisUrl)] } : {}),
        };
      },
    }),

    // ── Default connection (existing single-tenant DB / first tenant) ─────────
    // Keep this running during the migration period. Once all business modules
    // have been converted to TenantAwareService, remove this block and have all
    // data exclusively in per-tenant databases.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database') as TypeOrmModuleOptions,
    }),

    // ── Master connection ─────────────────────────────────────────────────────
    // Connects to `orderium_master` (or MASTER_DB_NAME env var).
    // Only the Tenant entity is registered here.
    // All other entities live in per-tenant databases.
    TypeOrmModule.forRootAsync({
      name: 'master',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: Number(configService.get('DB_PORT') ?? 5432),
        username: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || 'postgres',
        database:
          configService.get<string>('MASTER_DB_NAME') || 'orderium_master',
        entities: [Tenant, Payment, SubscriptionPlan, TenantActivityLog],
        synchronize: false,
        logging: configService.get<string>('DB_LOGGING') === 'true',
        extra: { max: 5, min: 1 },
      }),
    }),

    // Feature modules
    TenantModule,
    TenantLifecycleModule,
    ProductsModule,
    PartnersModule,
    OrdersModule,
    InvoicesModule,
    QuotesModule,
    DeliveryModule,
    PortalModule,
    NotificationsModule,
    StatisticsModule,
    PaymentsModule,
    ConfigurationsModule,
    InventoryModule,
    CategoriesModule,
    PDFModule,
    AuthModule,
    HealthModule,
    DriveModule,
    OnboardingModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      // Exclude routes that do NOT require a tenant context:
      //  • Tenant management API (super-admin, creates/manages tenants)
      //  • Health check endpoint
      .exclude(
        { path: 'api/admin/tenants', method: RequestMethod.ALL },
        { path: 'api/admin/tenants/(.*)', method: RequestMethod.ALL },
        { path: 'api/admin/payments', method: RequestMethod.ALL },
        { path: 'api/admin/payments/(.*)', method: RequestMethod.ALL },
        { path: 'api/admin/plans', method: RequestMethod.ALL },
        { path: 'api/admin/plans/(.*)', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
