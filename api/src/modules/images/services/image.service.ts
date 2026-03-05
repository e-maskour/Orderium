import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { fromBuffer } from 'file-type';
import {
  ImageUploadResult,
  ImageTransformOptions,
} from '../interfaces/image-storage.interface';
import { MinioProvider } from '../providers/minio.provider';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  constructor(private readonly minioProvider: MinioProvider) { }

  /**
   * Validate an uploaded file by checking MIME type, magic bytes, and size.
   */
  async validateFile(file: Express.Multer.File): Promise<void> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`,
      );
    }

    // Validate actual file content via magic bytes (not just client-provided MIME header)
    const detected = await fromBuffer(file.buffer);
    if (!detected || !this.ALLOWED_TYPES.includes(detected.mime)) {
      throw new BadRequestException(
        'File content does not match an allowed image type',
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Upload an image to MinIO after validation and optimisation.
   * Returns the full public URL and the object key (publicId).
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = 'general',
  ): Promise<ImageUploadResult> {
    await this.validateFile(file);

    try {
      const result = await this.minioProvider.upload(file, folder);
      this.logger.log(`✅ Image uploaded: ${result.publicId}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Image upload failed', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete an image from MinIO by its object key (publicId).
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    try {
      await this.minioProvider.delete(publicId);
      this.logger.log(`✅ Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error('❌ Image deletion failed', error);
      throw new BadRequestException('Failed to delete image');
    }
  }

  /**
   * Transform an image URL.  MinIO does not support runtime transforms,
   * so the original URL is returned unchanged.
   */
  transformUrl(url: string, options: ImageTransformOptions): string {
    if (!url) return '';
    return this.minioProvider.transformUrl(url, options);
  }

  /**
   * Return an optimised URL.  MinIO does not support dynamic resizing,
   * so the original URL is returned unchanged.
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url) return '';
    return this.minioProvider.getOptimizedUrl(url, width, height);
  }

  /**
   * Return a thumbnail URL.  MinIO stores pre-optimised images; the same
   * URL is used for all sizes.
   */
  getThumbnailUrl(url: string, _size = 300): string {
    return url;
  }

  /**
   * Return information about the active storage provider.
   */
  getProviderInfo(): { provider: string; name: string; configured: boolean } {
    return {
      provider: 'MINIO',
      name: this.minioProvider.getProviderName(),
      configured: this.minioProvider.isConfigured(),
    };
  }
}
