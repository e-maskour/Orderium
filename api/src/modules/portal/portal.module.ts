import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { Portal } from './entities/portal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Portal])],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
