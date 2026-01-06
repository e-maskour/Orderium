import { useLanguage } from '@/context/LanguageContext';
import { ProductCategory } from '@/types/database';
import { cn } from '@/lib/utils';
import { Package, Wrench, LayoutGrid } from 'lucide-react';

interface CategoryChipsProps {
  activeCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
}

export const CategoryChips = ({ activeCategory, onCategoryChange }: CategoryChipsProps) => {
  const { t, dir } = useLanguage();

  const categories: { id: ProductCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t('all'), icon: <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { id: 'products', label: t('products'), icon: <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { id: 'services', label: t('services'), icon: <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" dir={dir}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border min-h-[40px] sm:min-h-[44px]',
            activeCategory === category.id
              ? 'bg-primary text-white border-primary shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-sm'
          )}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
