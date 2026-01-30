import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageStorageProvider,
  ImageUploadResult,
  ImageTransformOptions,
} from '../interfaces/image-storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalProvider implements IImageStorageProvider {
  private readonly logger = new Logger(LocalProvider.name);
  private uploadDir: string;
  private baseUrl: string;
  private isReady = false;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.uploadDir = this.configService.get<string>(
        'LOCAL_UPLOAD_DIR',
        './uploads/images',
      );
      this.baseUrl = this.configService.get<string>(
        'LOCAL_BASE_URL',
        'http://localhost:3000/uploads/images',
      );

      // Ensure upload directory exists
      try {
        await fs.mkdir(this.uploadDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      this.isReady = true;
      this.logger.log(
        `✅ Local file storage provider initialized (dir: ${this.uploadDir})`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to initialize local provider:', error);
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<ImageUploadResult> {
    if (!this.isReady) {
      throw new Error('Local provider not initialized');
    }

    try {
      const folderPath = path.join(this.uploadDir, folder);

      // Create folder if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true });

      // Generate UUID for unique identifier (without filename)
      const uuid = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuid}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      // Write file to disk
      await fs.writeFile(filePath, file.buffer);

      // Return only relative path with UUID (no full URL)
      const relativePath = path.join(folder, fileName).replace(/\\/g, '/');

      this.logger.log(`✅ Saved locally: ${relativePath}`);

      return {
        url: relativePath, // Return relative path, NOT full URL
        publicId: relativePath,
        size: file.size,
        format: fileExtension.substring(1),
      };
    } catch (error) {
      this.logger.error('❌ Local upload failed:', error);
      throw error;
    }
  }

  async delete(publicId: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('Local provider not initialized');
    }

    try {
      const filePath = path.join(this.uploadDir, publicId);

      // Safety check to prevent directory traversal
      const resolvedDir = path.resolve(this.uploadDir);
      const resolvedPath = path.resolve(filePath);

      if (!resolvedPath.startsWith(resolvedDir)) {
        throw new Error('Invalid file path');
      }

      await fs.rm(filePath, { force: true });
      this.logger.log(`✅ Deleted locally: ${publicId}`);
    } catch (error) {
      this.logger.error(`❌ Local deletion failed for ${publicId}:`, error);
      throw error;
    }
  }

  transformUrl(url: string, options: ImageTransformOptions): string {
    // Local provider doesn't support transformations out of the box
    // Would need to use sharp or imagemagick for this
    return url;
  }

  getOptimizedUrl(url: string, width?: number, height?: number): string {
    // Local provider returns URL as-is
    // To support transformations, implement image resizing middleware
    return url;
  }

  isConfigured(): boolean {
    return this.isReady;
  }

  getProviderName(): string {
    return 'Local File System';
  }
}
