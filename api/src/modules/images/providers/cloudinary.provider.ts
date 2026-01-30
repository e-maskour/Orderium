import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageStorageProvider,
  ImageUploadResult,
  ImageTransformOptions,
} from '../interfaces/image-storage.interface';
import * as cloudinary from 'cloudinary';

@Injectable()
export class CloudinaryProvider implements IImageStorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);
  private isReady = false;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    try {
      const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

      if (cloudName && apiKey && apiSecret) {
        cloudinary.v2.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        this.isReady = true;
        this.logger.log('✅ Cloudinary provider initialized');
      } else {
        this.logger.warn('⚠️ Cloudinary credentials not configured');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Cloudinary:', error);
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'orderium/products',
  ): Promise<ImageUploadResult> {
    if (!this.isReady) {
      throw new Error('Cloudinary provider not configured');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
          timeout: 60000,
          eager: [{ width: 300, height: 300, crop: 'fill' }],
        },
        (error, result: any) => {
          if (error) {
            this.logger.error('Upload failed:', error);
            reject(error);
          } else if (result) {
            // Return public_id as relative path reference, not full URL
            // Frontend will construct the full URL when displaying
            resolve({
              url: result.public_id, // Store only public_id reference
              secureUrl: result.secure_url, // Available for direct use if needed
              publicId: result.public_id,
              size: result.bytes,
              format: result.format,
              width: result.width,
              height: result.height,
            });
          } else {
            reject(new Error('Upload returned no result'));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('Cloudinary provider not configured');
    }

    return new Promise((resolve, reject) => {
      cloudinary.v2.uploader.destroy(publicId, (error) => {
        if (error) {
          this.logger.error(`Failed to delete ${publicId}:`, error);
          reject(error);
        } else {
          this.logger.log(`✅ Deleted image: ${publicId}`);
          resolve();
        }
      });
    });
  }

  transformUrl(url: string, options: ImageTransformOptions): string {
    if (!url) return '';

    // Extract public ID from Cloudinary URL
    const publicId = this.extractPublicId(url);
    if (!publicId) return url;

    // Build transformation parameters
    const transforms: string[] = [];
    if (options.width || options.height) {
      transforms.push(
        `w_${options.width || 'auto'},h_${options.height || 'auto'},c_${options.crop || 'fill'}`,
      );
    }
    if (options.quality) {
      transforms.push(`q_${options.quality}`);
    }
    if (options.format) {
      transforms.push(`f_${options.format}`);
    }

    if (transforms.length === 0) return url;

    // Reconstruct URL with transformations
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const transformPath = transforms.join('/');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformPath}/${publicId}`;
  }

  getOptimizedUrl(
    url: string,
    width: number = 300,
    height: number = 300,
  ): string {
    return this.transformUrl(url, {
      width,
      height,
      crop: 'fill',
      quality: 80,
      format: 'auto',
    });
  }

  isConfigured(): boolean {
    return this.isReady;
  }

  getProviderName(): string {
    return 'Cloudinary';
  }

  private extractPublicId(url: string): string | null {
    // Extract public ID from Cloudinary URL format:
    // https://res.cloudinary.com/cloud_name/image/upload/[transformations]/public_id.format
    const match = url.match(/\/upload\/(?:.*?\/)?(.*?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  }
}
