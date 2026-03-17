import { useLanguage } from '@/context/LanguageContext';
import { ProductCategory } from '@/types/database';
import { Package, Wrench, LayoutGrid } from 'lucide-react';

interface CategoryChipsProps {
  activeCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
}

export const CategoryChips = ({ activeCategory, onCategoryChange }: CategoryChipsProps) => {
  const { t, dir } = useLanguage();

  const categories: { id: ProductCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t('all'), icon: <LayoutGrid style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'products', label: t('products'), icon: <Package style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'services', label: t('services'), icon: <Wrench style={{ width: '1rem', height: '1rem' }} /> },
  ];

  return (
    <div className="cl-filter-row" dir={dir}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`cl-chip${activeCategory === category.id ? ' active' : ''}`}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
