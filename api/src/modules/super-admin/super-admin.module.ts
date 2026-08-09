import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';
import { MigrationRunLog } from './entities/migration-log.entity';
import { SeedersController } from './seeders.controller';
import { SeedersService } from './seeders.service';
import { SeederRunLog } from './entities/seeder-log.entity';
import { Tenant } from '../tenant/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MigrationRunLog, SeederRunLog, Tenant], 'master'),
    TenantModule,
  ],
  controllers: [MigrationsController, SeedersController],
  providers: [MigrationsService, SeedersService],
})
export class SuperAdminModule {}
