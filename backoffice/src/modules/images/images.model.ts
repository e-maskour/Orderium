import { IImageUploadResult } from './images.interface';

export class UploadedImage implements IImageUploadResult {
  url: string;
  publicId: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  uploadedAt?: string;

  constructor(data: IImageUploadResult) {
    this.url = data.url;
    this.publicId = data.publicId;
    this.size = data.size;
    this.format = data.format;
    this.width = data.width;
    this.height = data.height;
    this.uploadedAt = data.uploadedAt;
  }

  get isCloudinary(): boolean {
    return this.publicId?.startsWith('orderium/') ?? this.url?.includes('cloudinary.com');
  }

  get fullUrl(): string {
    return this.url;
  }

  get dimensions(): string {
    if (!this.width || !this.height) return 'Unknown';
    return `${this.width}x${this.height}`;
  }

  get sizeInKb(): number | undefined {
    return this.size != null ? Math.round(this.size / 1024) : undefined;
  }

  get isSquare(): boolean {
    return !!this.width && !!this.height && this.width === this.height;
  }

  get aspectRatio(): number | undefined {
    if (!this.width || !this.height) return undefined;
    return this.width / this.height;
  }

  get hasMetadata(): boolean {
    return !!(this.width && this.height && this.size);
  }

  static fromApiResponse(data: any): UploadedImage {
    // Handle nested response structures: { data: { url, publicId } } or flat { url, publicId }
    const payload = data?.url ? data : (data?.data ?? data);
    return new UploadedImage({
      url: payload.url ?? payload.imageUrl ?? '',
      publicId: payload.publicId ?? payload.imagePublicId ?? '',
      size: payload.size,
      format: payload.format,
      width: payload.width,
      height: payload.height,
      uploadedAt: payload.uploadedAt ?? payload.dateCreated,
    });
  }

  toJSON(): IImageUploadResult {
    return {
      url: this.url,
      publicId: this.publicId,
      size: this.size,
      format: this.format,
      width: this.width,
      height: this.height,
      uploadedAt: this.uploadedAt,
    };
  }
}
