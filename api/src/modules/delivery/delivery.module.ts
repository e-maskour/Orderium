import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryPerson, OrderDelivery } from './entities/delivery.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPerson, OrderDelivery])],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
