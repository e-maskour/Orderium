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
}

export const ProductCard = ({ product }: ProductCardProps) => {
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

  return (
    <>
      <ProductQuantityModal 
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      <div 
        onClick={handleCardClick}
        className={cn(
          "group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col",
          !isOutOfStock && "cursor-pointer active:scale-[0.98]",
          isOutOfStock && "opacity-60"
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
      <div className="flex-1 p-1.5 flex flex-col">
        <h3 className="font-medium text-gray-900 line-clamp-1 leading-tight mb-1 text-xs">
          {displayName}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-primary">
            {formatCurrency(product.Price, language)}
          </span>

          {quantity > 0 && (
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 h-7" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDecrement}
                className="h-6 w-6 hover:bg-red-100 hover:text-red-600 rounded-sm p-0"
              >
                <Minus className="w-2.5 h-2.5" />
              </Button>
              <span className="w-6 text-center font-bold text-gray-900 text-xs">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleIncrement}
                disabled={product.Stock !== undefined && quantity >= product.Stock}
                className="h-6 w-6 hover:bg-primary/10 hover:text-primary rounded-sm disabled:opacity-50 p-0"
              >
                <Plus className="w-2.5 h-2.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};
