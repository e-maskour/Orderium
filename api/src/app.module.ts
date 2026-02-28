import { Module } from '@nestjs/common';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database') as TypeOrmModuleOptions,
    }),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule { }
