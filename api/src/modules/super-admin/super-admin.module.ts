import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';
import { MigrationRunLog } from './entities/migration-log.entity';
import { Tenant } from '../tenant/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MigrationRunLog, Tenant], 'master'),
    TenantModule,
  ],
  controllers: [MigrationsController],
  providers: [MigrationsService],
})
export class SuperAdminModule {}
