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
    { id: 'all', label: t('allProducts'), icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'products', label: t('products'), icon: <Package className="w-4 h-4" /> },
    { id: 'services', label: t('services'), icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" dir={dir}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
            activeCategory === category.id
              ? 'bg-primary text-primary-foreground shadow-soft scale-105'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-card'
          )}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
