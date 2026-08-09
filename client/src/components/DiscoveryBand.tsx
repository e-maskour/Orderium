import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Tag, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { interpolate } from '@/lib/i18n';
import { MediaThumb } from './MediaThumb';
import { shopPath } from '@/common/routes';

export interface DiscoveryEntry {
  id: number;
  name: string;
  imageUrl: string | null;
}

type Axis = 'brand' | 'category';

interface DiscoveryBandProps {
  brands: DiscoveryEntry[];
  categories: DiscoveryEntry[];
  loading: boolean;
}

const AXIS_ICON: Record<Axis, LucideIcon> = { brand: Tag, category: Package };

/**
 * One instrument for both catalogue axes.
 *
 * Brands and categories answer the same question — "narrow this down" — so they
 * share a single track that swaps contents, rather than stacking two grids the
 * shopkeeper has to scan twice.
 */
export const DiscoveryBand = ({ brands, categories, loading }: DiscoveryBandProps) => {
  const { t } = useLanguage();
  // Null until the shopkeeper picks: the opening tab is whichever axis actually
  // has depth, so a catalogue with two brands and forty categories doesn't open
  // on a near-empty shelf.
  const [picked, setPicked] = useState<Axis | null>(null);
  const axis: Axis = picked ?? (brands.length >= categories.length ? 'brand' : 'category');

  const entries = axis === 'brand' ? brands : categories;
  const Icon = AXIS_ICON[axis];
  const altTemplate = axis === 'brand' ? t('brandImageOf') : t('categoryImageOf');
  const hrefFor = (id: number) =>
    axis === 'brand' ? shopPath({ brandId: id }) : shopPath({ categoryId: id });

  // An axis with nothing behind it is not offered — an empty tab reads as broken.
  const axes: Axis[] = [
    ...(brands.length || loading ? (['brand'] as Axis[]) : []),
    ...(categories.length || loading ? (['category'] as Axis[]) : []),
  ];
  if (!axes.length) return null;
  const activeAxis = axes.includes(axis) ? axis : axes[0];

  return (
    <section className="cl-band" aria-labelledby="discovery-heading">
      <div className="cl-band-head">
        <p className="cl-eyebrow">{t('browseEyebrow')}</p>
        <h2 className="cl-band-title" id="discovery-heading">
          {t('browseTitle')}
        </h2>

        <div className="cl-segmented" role="tablist" aria-label={t('browseEyebrow')}>
          {axes.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={activeAxis === option}
              onClick={() => setPicked(option)}
              className={`cl-segment${activeAxis === option ? ' active' : ''}`}
            >
              {option === 'brand' ? t('browseByBrand') : t('browseByCategory')}
            </button>
          ))}
        </div>
      </div>

      <div className="cl-band-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cl-band-tile cl-band-tile-skeleton" aria-hidden="true">
                <span className="cl-band-tile-media cl-skeleton" />
                <span className="cl-band-tile-name cl-skeleton" />
              </div>
            ))
          : entries.map((entry) => (
              <Link key={entry.id} to={hrefFor(entry.id)} className="cl-band-tile">
                <MediaThumb
                  className="cl-band-tile-media"
                  src={entry.imageUrl}
                  alt={interpolate(altTemplate, { name: entry.name })}
                  icon={Icon}
                  radius="var(--cl-radius)"
                />
                <span className="cl-band-tile-name">{entry.name}</span>
              </Link>
            ))}
      </div>
    </section>
  );
};
