import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import {
    IImageStorageProvider,
    ImageUploadResult,
    ImageTransformOptions,
} from '../interfaces/image-storage.interface';

/**
 * MinIO storage provider.
 *
 * Stores all media objects in a single bucket with folder-based organisation:
 *   orderium-media/products/<uuid>.webp
 *   orderium-media/general/<uuid>.webp
 *   …
 *
 * Bucket access policy: public read (s3:GetObject) so that browsers can load
 * images directly without signed URLs.  Write operations are always
 * authenticated via access/secret key.
 *
 * Images are optimised server-side (max 1 200 × 1 200 px, WebP @ 85 %) before
 * being stored, keeping object sizes small and bandwidth predictable.
 */
@Injectable()
export class MinioProvider implements IImageStorageProvider, OnModuleInit {
    private readonly logger = new Logger(MinioProvider.name);

    private client: Minio.Client;
    private bucket: string;
    /** Public base URL reachable by browsers (e.g. http://localhost:9000) */
    private publicUrl: string;
    private ready = false;

    constructor(private readonly config: ConfigService) { }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async onModuleInit(): Promise<void> {
        const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10);
        const useSSL =
            this.config.get<string>('MINIO_USE_SSL', 'false').toLowerCase() === 'true';
        const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', '');
        const secretKey = this.config.get<string>('MINIO_SECRET_KEY', '');

        this.bucket = this.config.get<string>('MINIO_BUCKET', 'orderium-media');
        this.publicUrl = this.config.get<string>(
            'MINIO_PUBLIC_URL',
            'http://localhost:9000',
        );

        if (!accessKey || !secretKey) {
            this.logger.error(
                '❌ MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set.  ' +
                'MinIO provider will not be available.',
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
            this.logger.log(
                `✅ MinIO provider ready — endpoint: ${endpoint}:${port}, ` +
                `bucket: ${this.bucket}, public: ${this.publicUrl}`,
            );
        } catch (error) {
            this.logger.error('❌ MinIO provider initialisation failed', error);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Create the bucket if it does not exist, then apply a public-read policy
     * so that stored objects are accessible by URL without signed tokens.
     */
    private async ensureBucketReady(): Promise<void> {
        const exists = await this.client.bucketExists(this.bucket);

        if (!exists) {
            await this.client.makeBucket(this.bucket, 'us-east-1');
            this.logger.log(`🪣  Created bucket: ${this.bucket}`);
        }

        // Allow unauthenticated GET on all objects (public media).
        // No s3:ListBucket is granted — directory listing remains blocked.
        const policy = JSON.stringify({
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${this.bucket}/*`],
                },
            ],
        });

        await this.client.setBucketPolicy(this.bucket, policy);
        this.logger.log(`🔓  Public-read policy applied to bucket: ${this.bucket}`);
    }

    /** Construct the public URL for a stored object key. */
    private objectUrl(objectName: string): string {
        return `${this.publicUrl}/${this.bucket}/${objectName}`;
    }

    // ─── IImageStorageProvider ────────────────────────────────────────────────

    /**
     * Upload a file to MinIO.
     *
     * The image is optimised before storage:
     *  - resized to at most 1 200 × 1 200 px (preserving aspect ratio)
     *  - converted to WebP at 85 % quality
     *
     * The returned `url` is the full public URL; `publicId` is the object key
     * used by {@link delete}.
     */
    async upload(
        file: Express.Multer.File,
        folder: string = 'general',
    ): Promise<ImageUploadResult> {
        if (!this.ready) {
            throw new Error('MinIO provider is not initialised');
        }

        // Sanitise folder to prevent path traversal
        const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        const objectName = `${safeFolder}/${uuidv4()}.webp`;

        // Optimise: cap dimensions, transcode to WebP
        const optimised = await sharp(file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();

        await this.client.putObject(
            this.bucket,
            objectName,
            optimised,
            optimised.length,
            {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        );

        this.logger.log(
            `📤  ${objectName}  (${file.size} B → ${optimised.length} B)`,
        );

        return {
            url: this.objectUrl(objectName),
            publicId: objectName,
            size: optimised.length,
            format: 'webp',
        };
    }

    /**
     * Delete an object from MinIO by its key (publicId).
     */
    async delete(publicId: string): Promise<void> {
        if (!this.ready) {
            throw new Error('MinIO provider is not initialised');
        }

        // Guard against path traversal in the public ID
        if (publicId.includes('..') || publicId.startsWith('/')) {
            throw new Error(`Invalid publicId: ${publicId}`);
        }

        await this.client.removeObject(this.bucket, publicId);
        this.logger.log(`🗑️  Deleted: ${publicId}`);
    }

    /**
     * MinIO does not support real-time image transformations.
     * The original URL is returned unchanged.
     */
    transformUrl(url: string, _options: ImageTransformOptions): string {
        return url;
    }

    /**
     * MinIO does not support dynamic resizing.
     * The original URL is returned unchanged.
     */
    getOptimizedUrl(url: string, _width?: number, _height?: number): string {
        return url;
    }

    isConfigured(): boolean {
        return this.ready;
    }

    getProviderName(): string {
        return 'MinIO';
    }
}
