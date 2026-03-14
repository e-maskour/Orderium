import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface DriveUploadResult {
    storageKey: string;
    storageBucket: string;
    sizeBytes: number;
    checksumSha256: string;
}

const DRIVE_BUCKET = 'orderium-drive';
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
            this.config.get<string>('MINIO_USE_SSL', 'false').toLowerCase() === 'true';
        const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', '');
        const secretKey = this.config.get<string>('MINIO_SECRET_KEY', '');

        if (!accessKey || !secretKey) {
            this.logger.warn('⚠️  MINIO credentials not set — DriveStorage unavailable.');
            return;
        }

        try {
            this.client = new Minio.Client({ endPoint: endpoint, port, useSSL, accessKey, secretKey });
            await this.ensureBucketReady();
            this.ready = true;
            this.logger.log(`✅ DriveStorage ready — bucket: ${DRIVE_BUCKET}`);
        } catch (error) {
            this.logger.error('❌ DriveStorage initialisation failed', error);
        }
    }

    private async ensureBucketReady(): Promise<void> {
        const exists = await this.client.bucketExists(DRIVE_BUCKET);
        if (!exists) {
            await this.client.makeBucket(DRIVE_BUCKET, 'us-east-1');
            this.logger.log(`🪣  Created bucket: ${DRIVE_BUCKET}`);
        }
        // Drive bucket is PRIVATE — no public-read policy applied
    }

    async uploadFile(file: Express.Multer.File, folder = 'files'): Promise<DriveUploadResult> {
        if (!this.ready) throw new Error('DriveStorage is not initialised');

        const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '_').toLowerCase();
        const ext = file.originalname.includes('.')
            ? file.originalname.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
            : 'bin';
        const storageKey = `${safeFolder}/${uuidv4()}.${ext}`;
        const checksumSha256 = crypto
            .createHash('sha256')
            .update(file.buffer)
            .digest('hex');

        await this.client.putObject(
            DRIVE_BUCKET,
            storageKey,
            file.buffer,
            file.size,
            { 'Content-Type': file.mimetype, 'x-amz-checksum-sha256': checksumSha256 },
        );

        this.logger.log(`📤  Drive: ${storageKey} (${file.size} B)`);
        return { storageKey, storageBucket: DRIVE_BUCKET, sizeBytes: file.size, checksumSha256 };
    }

    async getPresignedDownloadUrl(storageKey: string): Promise<string> {
        if (!this.ready) throw new Error('DriveStorage is not initialised');
        // Guard against path traversal
        if (storageKey.includes('..') || storageKey.startsWith('/')) {
            throw new Error('Invalid storage key');
        }
        return this.client.presignedGetObject(DRIVE_BUCKET, storageKey, SIGNED_URL_EXPIRY_SECONDS);
    }

    async deleteFile(storageKey: string): Promise<void> {
        if (!this.ready) return; // If not ready, skip silently (node might have no storage)
        if (storageKey.includes('..') || storageKey.startsWith('/')) {
            throw new Error('Invalid storage key');
        }
        await this.client.removeObject(DRIVE_BUCKET, storageKey);
        this.logger.log(`🗑️  Drive deleted: ${storageKey}`);
    }

    isReady(): boolean {
        return this.ready;
    }
}
