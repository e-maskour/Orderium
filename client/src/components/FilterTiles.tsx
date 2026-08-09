import { useEffect, useRef } from 'react';
import { LayoutGrid, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { interpolate } from '@/lib/i18n';
import { MediaThumb } from './MediaThumb';

export interface FilterOption {
  id: number;
  label: string;
  imageUrl?: string | null;
}

interface FilterTilesProps {
  /** Section heading, e.g. "Marques". */
  title: string;
  /** Label of the reset tile, e.g. "Toutes les marques". */
  allLabel: string;
  options: FilterOption[];
  activeId: number | null;
  onChange: (id: number | null) => void;
  /** Placeholder icon used when an option has no image. */
  icon?: LucideIcon;
  /** Translated `alt` template containing a `{name}` token. */
  altTemplate: string;
  loading?: boolean;
}

export const FilterTiles = ({
  title,
  allLabel,
  options,
  activeId,
  onChange,
  icon,
  altTemplate,
  loading = false,
}: FilterTilesProps) => {
  const { dir } = useLanguage();
  const rowRef = useRef<HTMLDivElement>(null);

  // Arriving from a landing-page card can select a tile that sits off-screen in
  // the scroll row — bring it into view so the active filter is visible.
  useEffect(() => {
    if (loading || activeId == null) return;
    const tile = rowRef.current?.querySelector<HTMLElement>('.cl-ftile.active');
    tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId, loading]);

  if (!loading && options.length === 0) return null;

  return (
    <section className="cl-ftile-section" aria-label={title} dir={dir}>
      <h2 className="cl-ftile-title">{title}</h2>

      <div className="cl-filter-row cl-ftile-row" role="group" aria-label={title} ref={rowRef}>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={activeId === null}
          className={`cl-ftile${activeId === null ? ' active' : ''}`}
        >
          <span className="cl-ftile-media cl-ftile-media-all" aria-hidden="true">
            <LayoutGrid />
          </span>
          <span className="cl-ftile-label">{allLabel}</span>
        </button>

        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="cl-ftile cl-ftile-skeleton" aria-hidden="true">
                <span className="cl-skeleton cl-ftile-media" />
                <span className="cl-skeleton cl-ftile-label-skeleton" />
              </span>
            ))
          : options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                aria-pressed={activeId === option.id}
                className={`cl-ftile${activeId === option.id ? ' active' : ''}`}
              >
                <MediaThumb
                  className="cl-ftile-media"
                  src={option.imageUrl}
                  alt={interpolate(altTemplate, { name: option.label })}
                  icon={icon}
                  radius="var(--cl-radius-full)"
                />
                <span className="cl-ftile-label">{option.label}</span>
              </button>
            ))}
      </div>
    </section>
  );
};
