import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Tenant } from '../tenant/tenant.entity';
import { Payment } from './entities/payment.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { TenantActivityLog } from './entities/tenant-activity-log.entity';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { TenantLifecycleController } from './tenant-lifecycle.controller';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(
      [Tenant, Payment, SubscriptionPlan, TenantActivityLog],
      'master',
    ),
    TenantModule,
  ],
  controllers: [TenantLifecycleController],
  providers: [TenantLifecycleService],
  exports: [TenantLifecycleService],
})
export class TenantLifecycleModule {}
