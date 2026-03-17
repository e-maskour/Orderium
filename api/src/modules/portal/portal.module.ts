import { Module } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [TenantModule, AuthModule, OrdersModule, InvoicesModule, QuotesModule, ConfigurationsModule, PartnersModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule { }
