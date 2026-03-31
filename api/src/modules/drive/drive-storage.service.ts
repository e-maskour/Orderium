import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { tenantStorage } from '../tenant/tenant.context';

export interface DriveUploadResult {
  storageKey: string;
  storageBucket: string;
  sizeBytes: number;
  checksumSha256: string;
}

const DRIVE_BUCKET_FALLBACK = 'orderium-drive';
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

@Injectable()
export class DriveStorageService implements OnModuleInit {
  private readonly logger = new Logger(DriveStorageService.name);
  private client: Minio.Client;
  private ready = false;

  constructor(private readonly config: ConfigService) { }

  async onModuleInit(): Promise<void> {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL =
      this.config.get<string>('MINIO_USE_SSL', 'false').toLowerCase() ===
      'true';
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', '');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', '');

    if (!accessKey || !secretKey) {
      this.logger.warn(
        '⚠️  MINIO credentials not set — DriveStorage unavailable.',
      );
      return;
    }

    try {
      this.client = new Minio.Client({
        endPoint: endpoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
      await this.ensureBucketReady();
      this.ready = true;
      this.logger.log(`✅ DriveStorage ready — fallback bucket: ${DRIVE_BUCKET_FALLBACK}`);
    } catch (error) {
      this.logger.error('❌ DriveStorage initialisation failed', error);
    }
  }

  private async ensureBucketReady(): Promise<void> {
    const exists = await this.client.bucketExists(DRIVE_BUCKET_FALLBACK);
    if (!exists) {
      await this.client.makeBucket(DRIVE_BUCKET_FALLBACK, 'us-east-1');
      this.logger.log(`🪣  Created bucket: ${DRIVE_BUCKET_FALLBACK}`);
    }
    // Drive bucket is PRIVATE — no public-read policy applied
  }

  /**
   * Returns the bucket to use for the current request.
   * Resolves to `orderium-{tenantSlug}` when inside a tenant request,
   * falling back to the legacy shared bucket.
   */
  private getTenantBucket(): string {
    const ctx = tenantStorage.getStore();
    return ctx ? `orderium-${ctx.tenantSlug}` : DRIVE_BUCKET_FALLBACK;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'files',
  ): Promise<DriveUploadResult> {
    if (!this.ready) throw new Error('DriveStorage is not initialised');

    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '_').toLowerCase();
    const ext = file.originalname.includes('.')
      ? file.originalname
        .split('.')
        .pop()!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
      : 'bin';
    const storageKey = `${safeFolder}/${uuidv4()}.${ext}`;
    const checksumSha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const bucket = this.getTenantBucket();

    await this.client.putObject(
      bucket,
      storageKey,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'x-amz-checksum-sha256': checksumSha256,
      },
    );

    this.logger.log(`📤  Drive: [${bucket}] ${storageKey} (${file.size} B)`);
    return {
      storageKey,
      storageBucket: bucket,
      sizeBytes: file.size,
      checksumSha256,
    };
  }

  async getPresignedDownloadUrl(
    storageKey: string,
    storageBucket?: string,
  ): Promise<string> {
    if (!this.ready) throw new Error('DriveStorage is not initialised');
    // Guard against path traversal
    if (storageKey.includes('..') || storageKey.startsWith('/')) {
      throw new Error('Invalid storage key');
    }
    const bucket = storageBucket ?? this.getTenantBucket();
    return this.client.presignedGetObject(
      bucket,
      storageKey,
      SIGNED_URL_EXPIRY_SECONDS,
    );
  }

  async deleteFile(storageKey: string, storageBucket?: string): Promise<void> {
    if (!this.ready) return; // If not ready, skip silently (node might have no storage)
    if (storageKey.includes('..') || storageKey.startsWith('/')) {
      throw new Error('Invalid storage key');
    }
    const bucket = storageBucket ?? this.getTenantBucket();
    await this.client.removeObject(bucket, storageKey);
    this.logger.log(`🗑️  Drive deleted: [${bucket}] ${storageKey}`);
  }

  /**
   * Lists objects at a given prefix level (non-recursive, one level deep).
   * Returns common-prefix "folders" and actual file objects separately.
   */
  async listObjects(prefix: string, storageBucket?: string): Promise<{
    folders: Array<{ prefix: string; name: string }>;
    files: Array<{ key: string; name: string; sizeBytes: number; lastModified: Date; etag: string }>;
  }> {
    if (!this.ready) return { folders: [], files: [] };
    if (prefix && (prefix.includes('..') || prefix.startsWith('/'))) {
      throw new Error('Invalid prefix');
    }
    const bucket = storageBucket ?? this.getTenantBucket();

    const stream = this.client.listObjectsV2(bucket, prefix, false);
    const result: {
      folders: Array<{ prefix: string; name: string }>;
      files: Array<{ key: string; name: string; sizeBytes: number; lastModified: Date; etag: string }>;
    } = { folders: [], files: [] };

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (item) => {
        if (item.prefix) {
          // Common prefix — a virtual "folder"
          const folderPrefix = item.prefix as string;
          const name = folderPrefix.endsWith('/')
            ? folderPrefix.slice(prefix.length, -1)
            : folderPrefix.slice(prefix.length);
          result.folders.push({ prefix: folderPrefix, name: name || folderPrefix });
        } else if (item.name) {
          const key = item.name as string;
          const name = key.slice(prefix.length);
          if (name) {
            result.files.push({
              key,
              name,
              sizeBytes: item.size ?? 0,
              lastModified: item.lastModified ?? new Date(),
              etag: (item.etag ?? '').replace(/"/g, ''),
            });
          }
        }
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    return result;
  }

  isReady(): boolean {
    return this.ready;
  }
}
