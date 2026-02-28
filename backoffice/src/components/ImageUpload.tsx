import React, { useState, useRef } from 'react';
import { Upload, X, Loader, CheckCircle, AlertCircle, Image as ImageIcon, Link } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { productsService } from '../modules/products';
import { imagesService } from '../modules/images';

interface ImageUploadProps {
  onImageUpload: (imageUrl: string, imagePublicId?: string) => void;
  currentImage?: string;
  onImageRemove?: () => void;
  maxSizeMB?: number;
  folder?: string;
  productId?: number;
  isLoading?: boolean;
  disabled?: boolean;
  showPreview?: boolean;
  onModeChange?: (mode: 'file' | 'url') => void;
}

interface UploadStatus {
  state: 'idle' | 'uploading' | 'success' | 'error';
  progress?: number;
  message?: string;
  imageData?: {
    url: string;
    publicId: string;
    size: number;
    format: string;
  };
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  currentImage,
  onImageRemove,
  maxSizeMB = 5,
  folder = 'products',
  productId,
  isLoading: externalLoading,
  disabled,
  showPreview = true,
  onModeChange,
}) => {
  const { t } = useLanguage();
  // Get environment-based URLs
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const s3BaseUrl = import.meta.env.VITE_S3_BASE_URL || '';
  const cloudflareBaseUrl = import.meta.env.VITE_CLOUDFLARE_BASE_URL || '';

  // Helper function to convert relative path to full URL
  const getFullImageUrl = (imagePath?: string): string | null => {
    if (!imagePath) return null;

    if (imagePath.startsWith('http')) {
      return imagePath; // Already a full URL
    }

    if (imagePath.startsWith('orderium/')) {
      // Cloudinary URL
      return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imagePath}`;
    }

    if (imagePath.startsWith('s3://')) {
      // S3 URL
      return `${s3BaseUrl}/${imagePath.replace('s3://', '')}`;
    }

    // Relative path (LOCAL provider) - construct with API base URL
    return `${apiBaseUrl}/uploads/images/${imagePath}`;
  };

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const handleModeChange = (mode: 'file' | 'url') => {
    setUploadMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !externalLoading && uploadStatus.state !== 'uploading') {
      setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return t('invalidFileType');
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `${t('fileSizeExceeds')} ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadStatus({
        state: 'error',
        message: validationError,
      });
      return;
    }

    setUploadStatus({ state: 'uploading', progress: 0 });

    // Show local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLocalPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      let imageData: { url: string; publicId: string; size?: number; format?: string };

      if (productId) {
        const result = await productsService.uploadImage(productId, file);
        imageData = { url: result.imageUrl ?? '', publicId: result.publicId };
      } else {
        const result = await imagesService.upload(file, folder);
        imageData = { url: result.url, publicId: result.publicId, size: result.size, format: result.format };
      }

      const relativePath = imageData.url;
      const imagePublicId = imageData.publicId;

      // Construct full API URL by using the helper function
      let fullImageUrl = getFullImageUrl(relativePath);
      if (!fullImageUrl) {
        throw new Error(t('failedToConstructImageUrl'));
      }

      // Update local preview with actual uploaded image
      setLocalPreview(fullImageUrl);

      setUploadStatus({
        state: 'success',
        message: t('imageUploadedSuccessfully'),
        imageData: {
          url: fullImageUrl,
          publicId: imagePublicId,
          size: imageData.size ?? 0,
          format: imageData.format || 'image',
        },
      });

      // Call callback with full URL
      onImageUpload(fullImageUrl, imagePublicId);
    } catch (error: any) {
      setUploadStatus({
        state: 'error',
        message: error.message || `${t('uploadFailed')}. ${t('pleaseTryAgain')}.`,
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleUpload(files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || externalLoading || uploadStatus.state === 'uploading') return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUpload(files[0]);
    }
  };

  const handleRemoveImage = async () => {
    if (!productId) return;

    // Check if there's anything to remove (either uploaded or existing)
    if (!localPreview && !currentImage) return;

    try {
      await productsService.deleteImage(productId);

      // Clear all image states
      setLocalPreview(null);
      setUploadStatus({ state: 'idle' });
      setImageLoadError(false);

      if (onImageRemove) {
        onImageRemove();
      }
    } catch (error: any) {
      setUploadStatus({
        state: 'error',
        message: t('failedToRemoveImage'),
      });
    }
  };

  const isLoading = externalLoading || uploadStatus.state === 'uploading';
  const displayImage = localPreview || getFullImageUrl(currentImage);

  return (
    <div className="w-full h-full">
      {/* Upload Area / Preview Card */}
      <div
        onDragEnter={displayImage || uploadMode === 'url' ? undefined : handleDrag}
        onDragLeave={displayImage || uploadMode === 'url' ? undefined : handleDrag}
        onDragOver={displayImage || uploadMode === 'url' ? undefined : handleDrag}
        onDrop={displayImage || uploadMode === 'url' ? undefined : handleDrop}
        className={`relative border-2 rounded-lg transition-all ${displayImage
          ? 'border-solid border-slate-300 bg-white overflow-hidden h-64'
          : `border-dashed p-6 ${disabled || isLoading
            ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
            : dragActive
              ? 'border-amber-500 bg-amber-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
          }`
          }`}
        onClick={() => {
          if (displayImage) return; // Don't open file picker when showing image
          if (uploadMode === 'url') return; // Don't open file picker in URL mode
          if (!disabled && !isLoading) fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
          className="hidden"
        />

        {displayImage ? (
          // Preview in card
          <div className="relative w-full h-full bg-slate-100">
            {!imageLoadError ? (
              <img
                src={displayImage}
                alt={t('productPreview')}
                className="w-full h-full object-contain"
                onLoad={() => setImageLoadError(false)}
                onError={() => {
                  console.error('Failed to load image:', displayImage);
                  setImageLoadError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-200">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Failed to load image</p>
                  <p className="text-xs text-slate-400 mt-1">{displayImage}</p>
                </div>
              </div>
            )}

            {/* Remove button overlay */}
            {!isLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-md z-10"
                title={t('removeImage')}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Image info overlay */}
            {uploadStatus.imageData?.size && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 z-10">
                <p className="text-xs text-white">
                  {(uploadStatus.imageData.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            )}

            {/* Click to change image hint - only on hover */}
            {!imageLoadError && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer pointer-events-none hover:pointer-events-auto z-20"
              >
                <span className="text-white text-sm font-medium">Click to change image</span>
              </div>
            )}
          </div>
        ) : (
          // Upload UI
          <div className="flex flex-col items-center justify-center gap-3">
            {isLoading ? (
              <>
                <Loader className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700">Uploading...</p>
              </>
            ) : (
              <>
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeChange('file');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${uploadMode === 'file'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <Upload className="w-3 h-3 inline mr-1" />
                    Upload File
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeChange('url');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${uploadMode === 'url'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <Link className="w-3 h-3 inline mr-1" />
                    Paste URL
                  </button>
                </div>

                {uploadMode === 'file' && (
                  <>
                    <Upload className="w-8 h-8 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">
                        Drag and drop your image here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        or click to browse (Max {maxSizeMB}MB)
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Supported formats: JPEG, PNG, WebP
                    </p>
                  </>
                )}

                {uploadMode === 'url' && (
                  <div className="text-center">
                    <Link className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-900">
                      Paste URL mode active
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Use the input field below product code
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {uploadStatus.state === 'success' && uploadStatus.message && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">{uploadStatus.message}</p>
        </div>
      )}

      {uploadStatus.state === 'error' && uploadStatus.message && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-700">{uploadStatus.message}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
