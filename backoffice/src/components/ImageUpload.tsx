import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Camera,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { productsService } from '../modules/products';
import { imagesService } from '../modules/images';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

// ── Image processing utilities (module-level, no React deps) ─────────────────

const MAX_OUTPUT_PX = 1600; // max dimension of processed output

/**
 * Reads the EXIF orientation tag from a JPEG file.
 * Returns 1 (normal) when absent or on any parse error.
 * Only reads the first 64 KB — sufficient for the APP1 segment.
 */
async function readExifOrientation(file: File): Promise<number> {
  try {
    const buf = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return 1; // not a JPEG
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const segLen = view.getUint16(offset + 2);
      if (marker === 0xe1 && offset + 10 < view.byteLength) {
        // APP1 — verify "Exif" magic
        if (
          view.getUint8(offset + 4) === 0x45 &&
          view.getUint8(offset + 5) === 0x78 &&
          view.getUint8(offset + 6) === 0x69 &&
          view.getUint8(offset + 7) === 0x66
        ) {
          const tiff = offset + 10;
          const le = view.getUint16(tiff) === 0x4949; // little-endian?
          const ifdStart =
            tiff + (le ? view.getUint32(tiff + 4, true) : view.getUint32(tiff + 4, false));
          const nEntries = le ? view.getUint16(ifdStart, true) : view.getUint16(ifdStart, false);
          for (let i = 0; i < nEntries; i++) {
            const e = ifdStart + 2 + i * 12;
            if (e + 12 > view.byteLength) break;
            const tag = le ? view.getUint16(e, true) : view.getUint16(e, false);
            if (tag === 0x0112 /* Orientation */) {
              return le ? view.getUint16(e + 8, true) : view.getUint16(e + 8, false);
            }
          }
        }
      }
      offset += 2 + segLen;
    }
  } catch {
    /* ignore — return default */
  }
  return 1;
}

/**
 * Mild unsharp mask (Laplacian sharpening kernel [0,-1,0 / -1,5,-1 / 0,-1,0]).
 * Operates in-place on a canvas context.
 */
function applyUnsharpMask(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const stride = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * stride + x * 4;
      for (let c = 0; c < 3; c++) {
        dst[i + c] = Math.min(
          255,
          Math.max(
            0,
            5 * src[i + c] -
              src[i - 4 + c] -
              src[i + 4 + c] -
              src[i - stride + c] -
              src[i + stride + c],
          ),
        );
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Full image processing pipeline:
 *  1. Reads EXIF orientation — corrects rotated mobile photos
 *  2. Downscales if longest edge > MAX_OUTPUT_PX
 *  3. Applies mild unsharp mask for crispness
 *  4. Outputs as JPEG at quality 0.93 with white background
 *
 * The canvas ctx.transform matrices map scaled draw-space (sW×sH) to
 * oriented canvas-space (outW×outH) for all 8 EXIF orientations.
 */
async function processImageFile(file: File): Promise<File> {
  const orientation = await readExifOrientation(file);
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const swapped = orientation >= 5; // 90° / 270° — canvas w/h are swapped

      // Scale so longest logical edge ≤ MAX_OUTPUT_PX
      const logW = swapped ? nh : nw;
      const logH = swapped ? nw : nh;
      const ratio = Math.min(1, MAX_OUTPUT_PX / Math.max(logW, logH));
      const sW = Math.round(nw * ratio); // scaled natural width (draw size)
      const sH = Math.round(nh * ratio); // scaled natural height (draw size)
      const outW = swapped ? sH : sW; // canvas output width
      const outH = swapped ? sW : sH; // canvas output height

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White background prevents dark borders on PNG→JPEG conversion
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // 2-D affine transforms that map (sW×sH) draw-space into oriented canvas-space.
      // Derived from the identity that scaled dimensions follow the same transform
      // pattern as natural ones with sW/sH substituted for nw/nh.
      switch (orientation) {
        case 2:
          ctx.transform(-1, 0, 0, 1, sW, 0);
          break;
        case 3:
          ctx.transform(-1, 0, 0, -1, sW, sH);
          break;
        case 4:
          ctx.transform(1, 0, 0, -1, 0, sH);
          break;
        case 5:
          ctx.transform(0, 1, 1, 0, 0, 0);
          break;
        case 6:
          ctx.transform(0, 1, -1, 0, sH, 0);
          break;
        case 7:
          ctx.transform(0, -1, -1, 0, sH, sW);
          break;
        case 8:
          ctx.transform(0, -1, 1, 0, 0, sW);
          break;
        default:
          break; // orientation 1 — identity
      }
      ctx.drawImage(img, 0, 0, sW, sH);
      ctx.resetTransform();

      applyUnsharpMask(ctx, outW, outH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('toBlob failed'));
            return;
          }
          resolve(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.93,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };
    img.src = objectUrl;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

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

  const getFullImageUrl = (imagePath?: string): string | null => {
    if (!imagePath) return null;
    // Full URL (MinIO or any absolute URL): use directly
    if (imagePath.startsWith('http')) return imagePath;
    // Legacy fallback: construct from MinIO public URL
    const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
    return `${minioPublicUrl}/orderium-media/${imagePath}`;
  };

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  // Start / stop webcam tied to modal visibility
  useEffect(() => {
    if (!showCameraModal) return;
    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      })
      .catch((err: any) => {
        if (!cancelled) setCameraError(err.message || t('cameraAccessDenied'));
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [showCameraModal, t]);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !externalLoading && uploadStatus.state !== 'uploading') {
      setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const validateFile = (file: File): string | null => {
    // heic/heif are common from iOS camera; empty MIME can occur on some Android browsers
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''];
    if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type))
      return t('invalidFileType');
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
        // Server handles deleting the old image before uploading the new one
        const result = await productsService.uploadImage(productId, file);
        imageData = { url: result.imageUrl ?? '', publicId: result.publicId };
      } else {
        // Delete the previous image from storage before uploading the new one
        const previousPublicId = uploadStatus.imageData?.publicId;
        if (previousPublicId) {
          try {
            await imagesService.delete(previousPublicId);
          } catch {
            /* non-fatal */
          }
        }
        const result = await imagesService.upload(file, folder);
        imageData = {
          url: result.url,
          publicId: result.publicId,
          size: result.size,
          format: result.format,
        };
      }

      const relativePath = imageData.url;
      const imagePublicId = imageData.publicId;
      const fullImageUrl = getFullImageUrl(relativePath);
      if (!fullImageUrl) throw new Error(t('failedToConstructImageUrl'));

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
    if (!files?.length) return;
    // Process: fix EXIF orientation, resize, sharpen — then upload
    const processed = await processImageFile(files[0]).catch(() => files[0]);
    await handleUpload(processed);
    // Reset so the same file can be re-selected
    e.target.value = '';
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

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Scale to MAX_OUTPUT_PX on longest edge
    const ratio = Math.min(1, MAX_OUTPUT_PX / Math.max(vw, vh));
    const outW = Math.round(vw * ratio);
    const outH = Math.round(vh * ratio);
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(video, 0, 0, outW, outH);
    // Webcam feed has no EXIF — skip orientation fix, apply sharpening only
    applyUnsharpMask(ctx, outW, outH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setShowCameraModal(false);
        handleUpload(file);
      },
      'image/jpeg',
      0.93,
    );
  };

  const isLoading = externalLoading || uploadStatus.state === 'uploading';
  const displayImage = localPreview || getFullImageUrl(currentImage);

  const getDropZoneStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'relative',
      borderRadius: '0.5rem',
      transition: 'all 0.2s',
      height: '148px',
    };
    if (displayImage) {
      return { ...base, border: '2px solid #cbd5e1', background: '#fff', overflow: 'hidden' };
    }
    if (disabled || isLoading) {
      return {
        ...base,
        border: '2px dashed #e2e8f0',
        background: '#f8fafc',
        opacity: 0.5,
        cursor: 'not-allowed',
      };
    }
    if (dragActive) {
      return { ...base, border: '2px dashed #235ae4', background: '#eff6ff' };
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
          // On mobile the label buttons handle input — don't open file picker on zone tap
          if (displayImage || isMobile) return;
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
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: '#f1f5f9',
              overflow: 'visible',
            }}
          >
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
              <div
                className="flex flex-column align-items-center justify-content-center"
                style={{ width: '100%', height: '100%', background: '#e2e8f0' }}
              >
                <ImageIcon
                  style={{ width: 32, height: 32, color: '#94a3b8', marginBottom: '0.5rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t('failedToLoadImage')}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {displayImage}
                </span>
              </div>
            )}

            {/* Remove button overlay */}
            {!isLoading && (
              <Button
                text
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  padding: '0.375rem',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  zIndex: 50,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
                title={t('removeImage')}
              >
                <X style={{ width: 16, height: 16 }} />
              </Button>
            )}

            {/* Image info overlay */}
            {uploadStatus.imageData?.size && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  padding: '0.5rem',
                  zIndex: 10,
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#fff' }}>
                  {(uploadStatus.imageData.size / 1024 / 1024).toFixed(2)}MB
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex flex-column align-items-center justify-content-center gap-2"
            style={{ width: '100%', height: '100%' }}
          >
            {isLoading ? (
              <>
                <Loader
                  className="animate-spin"
                  style={{ width: 24, height: 24, color: '#235ae4' }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155' }}>
                  {t('uploading')}
                </span>
              </>
            ) : (
              <>
                {isMobile ? (
                  // Mobile-first: Camera is the primary action
                  <>
                    {/* label wrapper ensures camera opens on mobile without programmatic .click() */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.625rem 1.25rem',
                        background: '#235ae4',
                        borderRadius: '0.625rem',
                        cursor: 'pointer',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        boxShadow: '0 2px 8px rgba(35,90,228,0.35)',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        disabled={disabled || isLoading}
                        style={{ display: 'none' }}
                      />
                      <Camera style={{ width: 22, height: 22 }} />
                      {t('takePhoto')}
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#64748b',
                        fontSize: '0.6875rem',
                      }}
                    >
                      <Upload style={{ width: 12, height: 12 }} />
                      {t('orChooseFromGallery')}
                    </button>
                  </>
                ) : (
                  // Desktop: Upload + optional camera
                  <>
                    <Upload style={{ width: 24, height: 24, color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', textAlign: 'center' }}>
                      {t('clickOrDragToUpload')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCameraModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.25rem',
                        padding: '0.25rem 0.625rem',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                      }}
                    >
                      <Camera style={{ width: 12, height: 12 }} />
                      {t('useCamera')}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Change-image action bar — rendered outside the clipped box to avoid cutoff */}
      {displayImage && !isLoading && !imageLoadError && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {/* Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              padding: '0.4rem 0.5rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#475569',
            }}
          >
            <Upload style={{ width: 13, height: 13, flexShrink: 0 }} />
            {t('gallery')}
          </button>

          {/* Camera */}
          {isMobile ? (
            <label
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.4rem 0.5rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#235ae4',
              }}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                disabled={disabled || isLoading}
                style={{ display: 'none' }}
              />
              <Camera style={{ width: 13, height: 13, flexShrink: 0 }} />
              {t('camera')}
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              disabled={disabled || isLoading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.4rem 0.5rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#235ae4',
              }}
            >
              <Camera style={{ width: 13, height: 13, flexShrink: 0 }} />
              {t('camera')}
            </button>
          )}
        </div>
      )}
      {uploadStatus.state === 'success' && uploadStatus.message && (
        <div
          className="flex align-items-center gap-2"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '0.5rem',
          }}
        >
          <CheckCircle style={{ width: 16, height: 16, color: '#059669' }} />
          <span style={{ fontSize: '0.875rem', color: '#047857' }}>{uploadStatus.message}</span>
        </div>
      )}

      {uploadStatus.state === 'error' && uploadStatus.message && (
        <div
          className="flex align-items-center gap-2"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
          }}
        >
          <AlertCircle style={{ width: 16, height: 16, color: '#dc2626' }} />
          <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{uploadStatus.message}</span>
        </div>
      )}

      {/* Desktop webcam capture modal */}
      <Dialog
        visible={showCameraModal}
        onHide={() => setShowCameraModal(false)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera style={{ width: 18, height: 18 }} />
            <span>{t('takePhoto')}</span>
          </div>
        }
        style={{ width: 'min(90vw, 600px)' }}
        modal
        blockScroll
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cameraError ? (
            <div
              className="flex flex-column align-items-center justify-content-center gap-3"
              style={{
                padding: '2rem',
                background: '#fef2f2',
                borderRadius: '0.5rem',
                border: '1px solid #fecaca',
              }}
            >
              <AlertCircle style={{ width: 32, height: 32, color: '#dc2626' }} />
              <p style={{ margin: 0, color: '#b91c1c', textAlign: 'center', fontSize: '0.875rem' }}>
                {cameraError}
              </p>
              <Button
                label={t('retry')}
                outlined
                size="small"
                onClick={() => {
                  setShowCameraModal(false);
                  setTimeout(() => setShowCameraModal(true), 50);
                }}
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  position: 'relative',
                  background: '#0f172a',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  aspectRatio: '16 / 9',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {!cameraReady && (
                  <div
                    className="flex align-items-center justify-content-center"
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <Loader
                      className="animate-spin"
                      style={{ width: 36, height: 36, color: '#fff' }}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-content-center gap-3">
                <Button
                  label={t('capturePhoto')}
                  icon={<Camera style={{ width: 16, height: 16, marginRight: '0.375rem' }} />}
                  onClick={capturePhoto}
                  disabled={!cameraReady || isLoading}
                  style={{ background: '#235ae4', border: 'none' }}
                />
                <Button label={t('cancel')} outlined onClick={() => setShowCameraModal(false)} />
              </div>
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </Dialog>
    </div>
  );
};

export default ImageUpload;
