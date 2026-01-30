/**
 * Interface for image storage providers
 * Allows abstraction of different CDN/storage backends
 */
export interface ImageUploadResult {
  url: string;
  publicId: string;
  size: number;
  format: string;
  width?: number;
  height?: number;
  secureUrl?: string;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  crop?: 'fill' | 'fit' | 'scale';
}

export interface IImageStorageProvider {
  /**
   * Upload an image file
   */
  upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageUploadResult>;

  /**
   * Delete an image by its public ID
   */
  delete(publicId: string): Promise<void>;

  /**
   * Transform image URL with optimization parameters
   */
  transformUrl(url: string, options: ImageTransformOptions): string;

  /**
   * Get optimized URL with default settings
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string;

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
