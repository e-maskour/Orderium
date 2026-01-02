import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export const ProductCard = ({ product, viewMode = 'grid' }: ProductCardProps) => {
  const { language, t, dir } = useLanguage();
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const quantity = getItemQuantity(product.Id);
  const isOutOfStock = product.Stock !== undefined && product.Stock <= 0;
  
  // Get translated name/description if available
  const translation = productTranslations[product.Id];
  const displayName = language === 'fr' && translation ? translation.name : product.Name;

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      addItem(product);
    }
  };

  const handleIncrement = () => {
    updateQuantity(product.Id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.Id, quantity - 1);
    } else {
      removeItem(product.Id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on quantity controls
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!isOutOfStock) {
      setIsModalOpen(true);
    }
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <>
        <ProductQuantityModal 
          product={product}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuantity={quantity}
        />
        
        <div 
          onClick={handleCardClick}
          className={cn(
            "group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex gap-2 p-1.5 sm:p-2",
            !isOutOfStock && "cursor-pointer active:scale-[0.99]",
            isOutOfStock && "opacity-60",
            quantity > 0 && "ring-2 ring-primary bg-primary/5"
          )}
          dir={dir}
        >
          {/* Image */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={displayName}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500",
                  !isOutOfStock && "group-hover:scale-105"
                )}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
            )}
            
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-lg">
                  {t('outOfStock')}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-1 text-sm sm:text-base">
                {displayName}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-base sm:text-lg font-bold text-primary">
                  {formatCurrency(product.Price, language)}
                </p>
                {quantity > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs font-semibold rounded-full">
                    {quantity}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Grid view layout (existing)

  return (
    <>
      <ProductQuantityModal 
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuantity={quantity}
      />
      
      <div 
        onClick={handleCardClick}
        className={cn(
          "group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col",
          !isOutOfStock && "cursor-pointer active:scale-[0.98]",
          isOutOfStock && "opacity-60",
          quantity > 0 && "ring-2 ring-primary bg-primary/5"
        )}
        dir={dir}
      >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={displayName}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              !isOutOfStock && "group-hover:scale-105"
            )}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
        )}
        
        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-lg">
              {t('outOfStock')}
            </span>
          </div>
        )}

        {/* Quantity badge when in cart */}
        {quantity > 0 && !isOutOfStock && (
          <div className="absolute top-1 end-1 min-w-[20px] h-5 px-1 bg-primary text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-md">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
        <h3 className="font-medium text-gray-900 line-clamp-2 sm:line-clamp-1 leading-tight mb-1 text-[11px] sm:text-xs">
          {displayName}
        </h3>

        <div className="mt-auto">
          <span className="text-[11px] sm:text-xs font-bold text-primary">
            {formatCurrency(product.Price, language)}
          </span>
        </div>
      </div>
    </div>
    </>
  );
};
