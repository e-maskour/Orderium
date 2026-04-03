export interface IImageUploadResult {
  url: string;
  publicId: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  uploadedAt?: string;
}

export interface ImageUploadOptions {
  folder?: string;
}
