import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderItem } from './entities/order.entity';
import { PartnersModule } from '../partners/partners.module';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]), 
    PartnersModule,
    ConfigurationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
