import { useState, type CSSProperties } from 'react';
import { Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface MediaThumbProps {
  /**
   * Media reference from the API (object key or absolute URL).
   * This is the single swap point: the day `brand.logoUrl` / `category.imageUrl`
   * are populated by the API, pass them here and the placeholder disappears.
   */
  src?: string | null;
  /** Accessible description — also used as the placeholder's aria-label. */
  alt: string;
  /** Icon drawn in the placeholder when there is no image. */
  icon?: LucideIcon;
  /**
   * Square side length. Accepts any CSS length; numbers are treated as px.
   * Omit to let the caller's CSS class control sizing.
   */
  size?: number | string;
  /** Border radius. Defaults to the shared card radius token. */
  radius?: string;
  /** Fill the parent instead of using a fixed `size`. */
  fill?: boolean;
  /** Skip lazy-loading for above-the-fold thumbnails. */
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const MediaThumb = ({
  src,
  alt,
  icon: Icon = ImageIcon,
  size,
  radius = 'var(--cl-radius)',
  fill = false,
  eager = false,
  className = '',
  style,
}: MediaThumbProps) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);

  const side = typeof size === 'number' ? `${size}px` : size;
  const sizing: CSSProperties = fill
    ? { width: '100%', height: '100%' }
    : side
      ? { width: side, height: side }
      : {};
  const boxStyle: CSSProperties = { ...sizing, borderRadius: radius, ...style };

  if (!resolved || failed) {
    return (
      <div
        className={`cl-thumb cl-thumb-placeholder ${className}`}
        style={boxStyle}
        role="img"
        aria-label={alt}
      >
        <Icon className="cl-thumb-icon" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      className={`cl-thumb ${className}`}
      style={boxStyle}
      src={resolved}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};
