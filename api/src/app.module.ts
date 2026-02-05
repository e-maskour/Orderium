import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, databaseConfig, jwtConfig, defaultsConfig],
      envFilePath: ['.env.local', '.env'],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
