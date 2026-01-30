import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageStorageProvider,
  ImageUploadResult,
  ImageTransformOptions,
} from '../interfaces/image-storage.interface';
import { CloudinaryProvider } from '../providers/cloudinary.provider';
import { S3Provider } from '../providers/s3.provider';
import { LocalProvider } from '../providers/local.provider';

export type StorageProvider = 'CLOUDINARY' | 'AWS_S3' | 'LOCAL';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private provider: IImageStorageProvider;
  private activeProvider: StorageProvider;

  // Allowed file types
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private configService: ConfigService,
    private cloudinaryProvider: CloudinaryProvider,
    private s3Provider: S3Provider,
    private localProvider: LocalProvider,
  ) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const providerName = this.configService
      .get<string>('STORAGE_PROVIDER', 'LOCAL')
      .toUpperCase() as StorageProvider;

    this.activeProvider = providerName;

    switch (providerName) {
      case 'CLOUDINARY':
        if (!this.cloudinaryProvider.isConfigured()) {
          this.logger.warn(
            '⚠️ Cloudinary not configured, falling back to LOCAL',
          );
          this.provider = this.localProvider;
          this.activeProvider = 'LOCAL';
        } else {
          this.provider = this.cloudinaryProvider;
        }
        break;

      case 'AWS_S3':
        if (!this.s3Provider.isConfigured()) {
          this.logger.warn('⚠️ AWS S3 not configured, falling back to LOCAL');
          this.provider = this.localProvider;
          this.activeProvider = 'LOCAL';
        } else {
          this.provider = this.s3Provider;
        }
        break;

      case 'LOCAL':
      default:
        this.provider = this.localProvider;
        this.activeProvider = 'LOCAL';
    }

    this.logger.log(
      `✅ Active storage provider: ${this.provider.getProviderName()}`,
    );
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`,
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Upload image file
   */
  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageUploadResult> {
    this.validateFile(file);

    try {
      const result = await this.provider.upload(file, folder);

      this.logger.log(
        `✅ Image uploaded successfully: ${result.publicId} (${result.size} bytes)`,
      );

      return result;
    } catch (error) {
      this.logger.error('❌ Image upload failed:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete image by public ID
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    try {
      await this.provider.delete(publicId);
      this.logger.log(`✅ Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error('❌ Image deletion failed:', error);
      throw new BadRequestException('Failed to delete image');
    }
  }

  /**
   * Transform image URL with optimization options
   */
  transformUrl(url: string, options: ImageTransformOptions): string {
    if (!url) return '';
    return this.provider.transformUrl(url, options);
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url) return '';
    return this.provider.getOptimizedUrl(url, width, height);
  }

  /**
   * Get thumbnail URL (common use case)
   */
  getThumbnailUrl(url: string, size: number = 300): string {
    return this.getOptimizedUrl(url, size, size);
  }

  /**
   * Get provider information
   */
  getProviderInfo(): {
    provider: string;
    name: string;
    configured: boolean;
  } {
    return {
      provider: this.activeProvider,
      name: this.provider.getProviderName(),
      configured: this.provider.isConfigured(),
    };
  }
}
