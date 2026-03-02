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
    <div className="flex gap-2 overflow-x-auto pb-1" dir={dir} style={{ scrollbarWidth: 'none' }}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`flex align-items-center gap-2 border-round-lg font-medium white-space-nowrap transition-all border-1 cursor-pointer ${activeCategory === category.id
              ? 'bg-primary text-white border-primary shadow-2'
              : 'surface-card text-color border-300'
            }`}
          style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', minHeight: '2.75rem' }}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
