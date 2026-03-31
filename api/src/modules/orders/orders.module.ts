import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderPaymentsService } from './order-payments.service';
import { OrderPaymentsController } from './order-payments.controller';
import { TenantModule } from '../tenant/tenant.module';
import { PartnersModule } from '../partners/partners.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PDFModule } from '../pdf/pdf.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TenantModule,
    PartnersModule,
    ConfigurationsModule,
    forwardRef(() => NotificationsModule),
    PDFModule,
    InventoryModule,
  ],
  controllers: [OrdersController, OrderPaymentsController],
  providers: [OrdersService, OrderPaymentsService],
  exports: [OrdersService, OrderPaymentsService],
})
export class OrdersModule { }
