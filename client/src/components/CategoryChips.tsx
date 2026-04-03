import { useLanguage } from '@/context/LanguageContext';
import { LayoutGrid } from 'lucide-react';
import type { Category } from '@/hooks/useCategories';

interface CategoryChipsProps {
  categories: Category[];
  activeCategoryId: number | null;
  onCategoryChange: (id: number | null) => void;
}

export const CategoryChips = ({
  categories,
  activeCategoryId,
  onCategoryChange,
}: CategoryChipsProps) => {
  const { t, dir } = useLanguage();

  return (
    <div className="cl-filter-row" dir={dir}>
      {/* "All" chip */}
      <button
        onClick={() => onCategoryChange(null)}
        className={`cl-chip${activeCategoryId === null ? ' active' : ''}`}
      >
        <LayoutGrid style={{ width: '1rem', height: '1rem' }} />
        <span>{t('all')}</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`cl-chip${activeCategoryId === cat.id ? ' active' : ''}`}
        >
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  );
};
