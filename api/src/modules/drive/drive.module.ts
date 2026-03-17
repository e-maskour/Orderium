import { Module } from '@nestjs/common';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';
import { DriveStorageService } from './drive-storage.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [DriveController],
  providers: [DriveService, DriveStorageService],
  exports: [DriveService],
})
export class DriveModule { }
