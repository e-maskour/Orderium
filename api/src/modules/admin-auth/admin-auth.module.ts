import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdmin } from './entities/platform-admin.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminMailerService } from './admin-mailer.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminSessionGuard } from './admin-session.guard';

/**
 * Global so SuperAdminGuard can resolve AdminAuthService in every module that
 * uses it (tenant, tenant-lifecycle, super-admin, platform-metrics, …).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PlatformAdmin], 'master')],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminMailerService, AdminSessionGuard],
  exports: [AdminAuthService, AdminSessionGuard, AdminMailerService],
})
export class AdminAuthModule {}
