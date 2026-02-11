import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Order } from '../orders/entities/order.entity';
import { Partner } from '../partners/entities/partner.entity';
import { DeliveryPerson } from '../delivery/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Partner, DeliveryPerson, Product])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
