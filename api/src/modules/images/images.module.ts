import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageService } from './services/image.service';
import { ImagesController } from './controllers/images.controller';
import { MinioProvider } from './providers/minio.provider';

@Module({
  imports: [ConfigModule],
  providers: [ImageService, MinioProvider],
  controllers: [ImagesController],
  exports: [ImageService],
})
export class ImagesModule { }
