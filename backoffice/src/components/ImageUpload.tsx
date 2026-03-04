import React, { useState, useRef } from 'react';
import { Upload, X, Loader, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
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
}) => {
  const { t } = useLanguage();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const s3BaseUrl = import.meta.env.VITE_S3_BASE_URL || '';
  const cloudflareBaseUrl = import.meta.env.VITE_CLOUDFLARE_BASE_URL || '';

  const getFullImageUrl = (imagePath?: string): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('orderium/')) return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imagePath}`;
    if (imagePath.startsWith('s3://')) return `${s3BaseUrl}/${imagePath.replace('s3://', '')}`;
    return `${apiBaseUrl}/uploads/images/${imagePath}`;
  };

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !externalLoading && uploadStatus.state !== 'uploading') {
      setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return t('invalidFileType');
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) return `${t('fileSizeExceeds')} ${maxSizeMB}MB`;
    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadStatus({ state: 'error', message: validationError });
      return;
    }

    setUploadStatus({ state: 'uploading', progress: 0 });

    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
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
      let fullImageUrl = getFullImageUrl(relativePath);
      if (!fullImageUrl) throw new Error(t('failedToConstructImageUrl'));

      setLocalPreview(fullImageUrl);
      setUploadStatus({
        state: 'success',
        message: t('imageUploadedSuccessfully'),
        imageData: { url: fullImageUrl, publicId: imagePublicId, size: imageData.size ?? 0, format: imageData.format || 'image' },
      });
      onImageUpload(fullImageUrl, imagePublicId);
    } catch (error: any) {
      setUploadStatus({ state: 'error', message: error.message || `${t('uploadFailed')}. ${t('pleaseTryAgain')}.` });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await handleUpload(files[0]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || externalLoading || uploadStatus.state === 'uploading') return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) await handleUpload(files[0]);
  };

  const handleRemoveImage = async () => {
    if (!productId) return;
    if (!localPreview && !currentImage) return;
    try {
      await productsService.deleteImage(productId);
      setLocalPreview(null);
      setUploadStatus({ state: 'idle' });
      setImageLoadError(false);
      if (onImageRemove) onImageRemove();
    } catch (error: any) {
      setUploadStatus({ state: 'error', message: t('failedToRemoveImage') });
    }
  };

  const isLoading = externalLoading || uploadStatus.state === 'uploading';
  const displayImage = localPreview || getFullImageUrl(currentImage);

  const getDropZoneStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'relative', borderRadius: '0.5rem', transition: 'all 0.2s', height: '148px' };
    if (displayImage) {
      return { ...base, border: '2px solid #cbd5e1', background: '#fff', overflow: 'hidden' };
    }
    if (disabled || isLoading) {
      return { ...base, border: '2px dashed #e2e8f0', background: '#f8fafc', opacity: 0.5, cursor: 'not-allowed' };
    }
    if (dragActive) {
      return { ...base, border: '2px dashed #f59e0b', background: '#fffbeb' };
    }
    return { ...base, border: '2px dashed #cbd5e1', cursor: 'pointer' };
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Upload Area / Preview Card */}
      <div
        onDragEnter={displayImage ? undefined : handleDrag}
        onDragLeave={displayImage ? undefined : handleDrag}
        onDragOver={displayImage ? undefined : handleDrag}
        onDrop={displayImage ? undefined : handleDrop}
        style={getDropZoneStyle()}
        onClick={() => {
          if (displayImage) return;
          if (!disabled && !isLoading) fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
          style={{ display: 'none' }}
        />

        {displayImage ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f1f5f9' }}>
            {!imageLoadError ? (
              <img
                src={displayImage}
                alt={t('productPreview')}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onLoad={() => setImageLoadError(false)}
                onError={() => {
                  console.error('Failed to load image:', displayImage);
                  setImageLoadError(true);
                }}
              />
            ) : (
              <div className="flex flex-column align-items-center justify-content-center" style={{ width: '100%', height: '100%', background: '#e2e8f0' }}>
                <ImageIcon style={{ width: 32, height: 32, color: '#94a3b8', marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Failed to load image</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{displayImage}</span>
              </div>
            )}

            {/* Remove button overlay */}
            {!isLoading && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                style={{ position: 'absolute', top: 8, right: 8, padding: '0.375rem', background: '#ef4444', color: '#fff', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                title={t('removeImage')}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            )}

            {/* Image info overlay */}
            {uploadStatus.imageData?.size && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '0.5rem', zIndex: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#fff' }}>{(uploadStatus.imageData.size / 1024 / 1024).toFixed(2)}MB</span>
              </div>
            )}

            {/* Click to change image hint */}
            {!imageLoadError && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex align-items-center justify-content-center"
                style={{ position: 'absolute', inset: 0, background: 'transparent', cursor: 'pointer', zIndex: 20, opacity: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>Click to change image</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-column align-items-center justify-content-center gap-2" style={{ width: '100%', height: '100%' }}>
            {isLoading ? (
              <>
                <Loader className="animate-spin" style={{ width: 24, height: 24, color: '#f59e0b' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155' }}>Uploading...</span>
              </>
            ) : (
              <>
                <Upload style={{ width: 24, height: 24, color: '#94a3b8' }} />
                <span style={{ fontSize: '0.6875rem', color: '#64748b', textAlign: 'center' }}>Click or drag</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {uploadStatus.state === 'success' && uploadStatus.message && (
        <div className="flex align-items-center gap-2" style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem' }}>
          <CheckCircle style={{ width: 16, height: 16, color: '#059669' }} />
          <span style={{ fontSize: '0.875rem', color: '#047857' }}>{uploadStatus.message}</span>
        </div>
      )}

      {uploadStatus.state === 'error' && uploadStatus.message && (
        <div className="flex align-items-center gap-2" style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#dc2626' }} />
          <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
