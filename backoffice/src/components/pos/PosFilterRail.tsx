import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/media';

export interface PosFilterOption {
  id: number;
  name: string;
  /**
   * Media reference for the tile thumbnail — `imageUrl` for categories,
   * `logoUrl` for brands. Falls back to the axis icon when absent.
   */
  imageUrl?: string | null;
}

interface PosFilterRailProps {
  /** Axis name shown in the fixed leading label — this is what tells the two rails apart */
  label: string;
  icon: LucideIcon;
  options: PosFilterOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  /** Label for the "no filter" tile */
  allLabel: string;
}

/** Thumbnail that degrades to the axis icon when there is no image, or it fails to load. */
function TileThumb({
  src,
  alt,
  icon: Icon,
}: {
  src?: string | null;
  alt: string;
  icon: LucideIcon;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);

  if (!resolved || failed) {
    return (
      <span className="pos-rail__thumb pos-rail__thumb--placeholder" role="img" aria-label={alt}>
        <Icon aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      className="pos-rail__thumb"
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * One filter axis in the POS product browser.
 *
 * Touch-first: every tile clears a 44px hit target so it can be tapped reliably
 * on a counter terminal. The leading label stays fixed while the track scrolls,
 * so the operator always knows which axis they are touching. Tiles carry the
 * category image / brand logo so they can be recognised by shape at a glance.
 */
export function PosFilterRail({
  label,
  icon: Icon,
  options,
  selectedId,
  onSelect,
  allLabel,
}: PosFilterRailProps) {
  return (
    <div className="pos-rail" role="group" aria-label={label}>
      <div className="pos-rail__label">
        <Icon className="pos-rail__label-icon" aria-hidden="true" />
        <span>{label}</span>
      </div>

      <div className="pos-rail__track">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selectedId === null}
          className={`pos-rail__tile${selectedId === null ? ' is-active' : ''}`}
        >
          <span className="pos-rail__tile-label">{allLabel}</span>
        </button>

        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={selectedId === option.id}
            className={`pos-rail__tile has-thumb${selectedId === option.id ? ' is-active' : ''}`}
            title={option.name}
          >
            <TileThumb src={option.imageUrl} alt={option.name} icon={Icon} />
            <span className="pos-rail__tile-label">{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
