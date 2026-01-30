import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageStorageProvider,
  ImageUploadResult,
  ImageTransformOptions,
} from '../interfaces/image-storage.interface';
import * as AWS from 'aws-sdk';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Provider implements IImageStorageProvider {
  private readonly logger = new Logger(S3Provider.name);
  private s3: AWS.S3;
  private bucket: string;
  private region: string;
  private isReady = false;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
      this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');
      const accessKeyId = this.configService.get<string>(
        'AWS_ACCESS_KEY_ID',
        '',
      );
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );

      if (this.bucket && accessKeyId && secretAccessKey) {
        this.s3 = new AWS.S3({
          region: this.region,
          accessKeyId,
          secretAccessKey,
        });
        this.isReady = true;
        this.logger.log(
          `✅ AWS S3 provider initialized (bucket: ${this.bucket})`,
        );
      } else {
        this.logger.warn('⚠️ AWS S3 credentials not configured');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize AWS S3:', error);
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<ImageUploadResult> {
    if (!this.isReady) {
      throw new Error('AWS S3 provider not configured');
    }

    // Use UUID instead of filename
    const uuid = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const key = `${folder}/${uuid}${fileExtension}`;

    try {
      const result = await (this.s3
        .upload({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
          CacheControl: 'max-age=31536000', // 1 year
        })
        .promise() as any);

      this.logger.log(`✅ Uploaded to S3: ${key}`);

      return {
        url: key, // Return only the relative path/key, not the full Location URL
        publicId: key,
        size: file.size,
        format: fileExtension.substring(1),
      };
    } catch (error) {
      this.logger.error(`❌ S3 upload failed for ${key}:`, error);
      throw error;
    }
  }

  async delete(publicId: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('AWS S3 provider not configured');
    }

    try {
      await (this.s3
        .deleteObject({
          Bucket: this.bucket,
          Key: publicId,
        })
        .promise() as any);

      this.logger.log(`✅ Deleted from S3: ${publicId}`);
    } catch (error) {
      this.logger.error(`❌ S3 deletion failed for ${publicId}:`, error);
      throw error;
    }
  }

  transformUrl(url: string, options: ImageTransformOptions): string {
    // S3 doesn't provide built-in image transformation like Cloudinary
    // For transformations, we'd typically use CloudFront with Lambda@Edge or a separate image processing service
    // For now, we return the original URL
    // To implement transformations, consider using AWS CloudFront with Lambda@Edge or Imgix
    return url;
  }

  getOptimizedUrl(url: string, width?: number, height?: number): string {
    // S3 + CloudFront returns as-is (unless using Lambda@Edge)
    return url;
  }

  isConfigured(): boolean {
    return this.isReady;
  }

  getProviderName(): string {
    return 'AWS S3';
  }
}
