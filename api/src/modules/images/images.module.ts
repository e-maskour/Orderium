import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageService } from './services/image.service';
import { ImagesController } from './controllers/images.controller';
import { MinioProvider } from './providers/minio.provider';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [ConfigModule, TenantModule],
  providers: [ImageService, MinioProvider],
  controllers: [ImagesController],
  exports: [ImageService, MinioProvider],
})
export class ImagesModule {}
