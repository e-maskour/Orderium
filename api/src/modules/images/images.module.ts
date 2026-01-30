import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageService } from './services/image.service';
import { ImagesController } from './controllers/images.controller';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { S3Provider } from './providers/s3.provider';
import { LocalProvider } from './providers/local.provider';

@Module({
  imports: [ConfigModule],
  providers: [ImageService, CloudinaryProvider, S3Provider, LocalProvider],
  controllers: [ImagesController],
  exports: [ImageService], // Export for use in other modules
})
export class ImagesModule {}
