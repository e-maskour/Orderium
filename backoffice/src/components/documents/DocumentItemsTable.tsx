import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { DocumentItem } from '../../modules/documents/types';
import { calculateItemTotal } from '../../modules/documents/hooks';
import { Product } from '../../modules/products/products.interface';
import { productsService } from '../../modules/products/products.service';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCatalogueModal } from '../ProductCatalogueModal';
import { Autocomplete } from '../ui/autocomplete';

interface DocumentItemsTableProps {
  items: DocumentItem[];
  direction: 'vente' | 'achat';
  readOnly?: boolean;
  onItemsChange: (items: DocumentItem[]) => void;
  showTaxColumn?: boolean;
  showDiscountColumn?: boolean;
  showPriceColumn?: boolean;
  showTotalColumn?: boolean;
}

export function DocumentItemsTable({
  items,
  direction,
  readOnly = false,
  onItemsChange,
  showTaxColumn = true,
  showDiscountColumn = true,
  showPriceColumn = true,
  showTotalColumn = true
}: DocumentItemsTableProps) {
  const { t, language } = useLanguage();
  const isVente = direction === 'vente';

  const [products, setProducts] = useState<Product[]>([]);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsService.getProducts({ limit: 100 });
        setProducts(response.products || []);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      }
    };

    loadProducts();
  }, []);

  const handleAddItem = () => {
    const newId = (Math.max(...items.map(i => parseInt(i.id)), 0) + 1).toString();
    const newItems = [...items, {
      id: newId,
      productId: undefined,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 0,
      tax: 0,
      total: 0
    }];
    onItemsChange(newItems);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      onItemsChange(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof DocumentItem, value: any) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = calculateItemTotal(updated);
        return updated;
      }
      return item;
    });
    onItemsChange(newItems);
  };

  const handleSelectProduct = (itemId: string, productIdStr: string) => {
    const productId = Number(productIdStr);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItemIndex = items.findIndex(item => item.productId === product.id);

    if (existingItemIndex !== -1) {
      const updatedItems = items.map((item, index) => {
        if (index === existingItemIndex) {
          const updated = {
            ...item,
            quantity: item.quantity + 1
          };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      });
      onItemsChange(updatedItems);
    } else {
      const newItems = items.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            productId: product.id,
            description: product.name,
            unitPrice: isVente ? product.price : (product.cost || product.price),
            tax: (isVente ? product.saleTax : product.purchaseTax) || 0
          };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      });
      onItemsChange(newItems);
    }
  };

  const handleCatalogueItemsChange = (newItems: DocumentItem[]) => {
    onItemsChange(newItems);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-2 sm:p-4 md:p-6 overflow-visible">
        <div className="mb-3 sm:mb-4 md:mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-800">{t('invoice.articlesTitle')}</h3>
        </div>

        {/* Desktop Table View - Hidden on mobile and tablet */}
        <div className="hidden lg:block overflow-x-auto" style={{ overflowY: 'visible' }}>
          <table className="w-full" style={{ overflow: 'visible' }}>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-[35%] min-w-[240px]">
                  {t('invoice.descriptionHeader')}
                </th>
                <th className="text-left py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-24">
                  {t('invoice.quantityHeader')}
                </th>
                {showPriceColumn && (
                  <th className="text-left py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-56">
                    {t('invoice.unitPriceHeader')}
                  </th>
                )}
                {showDiscountColumn && (
                  <th className="text-left py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-16">
                    {t('invoice.discountHeader')}
                  </th>
                )}
                {showTaxColumn && (
                  <th className="text-left py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-32">
                    {t('invoice.tax')}
                  </th>
                )}
                {showTotalColumn && (
                  <th className="text-center py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 w-32">
                    {t('invoice.totalHeader')}
                  </th>
                )}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody style={{ overflow: 'visible' }}>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50" style={{ overflow: 'visible' }}>
                  <td className="py-3 px-3 w-[35%] min-w-[240px]" style={{ overflow: 'visible' }}>
                    <Autocomplete
                      options={products.map(product => ({
                        value: String(product.id),
                        label: product.name
                      }))}
                      value={item.productId ? String(item.productId) : ''}
                      onValueChange={(value) => handleSelectProduct(item.id, value)}
                      placeholder={t('invoice.itemDescriptionPlaceholder')}
                      emptyMessage={t('invoice.noProductsFound')}
                      disabled={readOnly}
                      allowCustomValue={false}
                      className="text-sm"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    />
                  </td>
                  {showPriceColumn && (
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={readOnly}
                      />
                    </td>
                  )}
                  {showDiscountColumn && (
                    <td className="py-3 px-3">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.discount}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-14 flex-none px-2 py-2 text-sm text-center focus:outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                          disabled={readOnly}
                        />
                        <button
                          type="button"
                          onClick={() => !readOnly && handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)}
                          className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-w-[40px] transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                          disabled={readOnly}
                        >
                          {item.discountType === 0 ? 'DH' : '%'}
                        </button>
                      </div>
                    </td>
                  )}
                  {showTaxColumn && (
                    <td className="py-3 px-3">
                      <select
                        value={item.tax}
                        onChange={(e) => handleItemChange(item.id, 'tax', parseFloat(e.target.value))}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={readOnly}
                      >
                        <option value={0}>0%</option>
                        <option value={10}>10%</option>
                        <option value={20}>20%</option>
                      </select>
                    </td>
                  )}
                  {showTotalColumn && (
                    <td className="py-3 px-3">
                      <div className="text-center font-semibold text-slate-800 text-sm">
                        {calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-3">
                    {!readOnly && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View - Shown on mobile and tablet */}
        <div className="lg:hidden space-y-3 sm:space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-white">
              {/* Item Number */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm sm:text-base font-semibold text-slate-800">
                  Item {index + 1}
                </h4>
                {!readOnly && items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                )}
              </div>

              {/* Description Field */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                  {t('invoice.descriptionHeader')} <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={products.map(product => ({
                    value: String(product.id),
                    label: product.name
                  }))}
                  value={item.productId ? String(item.productId) : ''}
                  onValueChange={(value) => handleSelectProduct(item.id, value)}
                  placeholder={t('invoice.itemDescriptionPlaceholder')}
                  emptyMessage={t('invoice.noProductsFound')}
                  disabled={readOnly}
                  allowCustomValue={false}
                />
              </div>

              {/* Quantity & Unit Price - Side by side on mobile */}
              <div className={`grid gap-2 sm:gap-3 mb-3 sm:mb-4 ${showPriceColumn ? 'grid-cols-3' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                    {t('invoice.quantityHeader')}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg text-sm sm:text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={readOnly}
                  />
                </div>
                {showPriceColumn && (
                  <div className="col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                      {t('invoice.unitPriceHeader')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg text-sm sm:text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>

              {/* Discount & Tax - Side by side on mobile */}
              <div className="space-y-3 sm:space-y-4">
                {showDiscountColumn && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                        {t('invoice.discountHeader')}
                      </label>
                      <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.discount}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base text-center focus:outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                          disabled={readOnly}
                        />
                        <button
                          type="button"
                          onClick={() => !readOnly && handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)}
                          className="px-2 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium min-w-[44px] transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                          disabled={readOnly}
                        >
                          {item.discountType === 0 ? 'DH' : '%'}
                        </button>
                      </div>
                    </div>
                    {showTaxColumn && (
                      <div className="col-span-1">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                          {t('invoice.tax')}
                        </label>
                        <select
                          value={item.tax}
                          onChange={(e) => handleItemChange(item.id, 'tax', parseFloat(e.target.value))}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg text-sm sm:text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                          disabled={readOnly}
                        >
                          <option value={0}>0%</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {showDiscountColumn === false && showTaxColumn && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                      {t('invoice.tax')}
                    </label>
                    <select
                      value={item.tax}
                      onChange={(e) => handleItemChange(item.id, 'tax', parseFloat(e.target.value))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg text-sm sm:text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    >
                      <option value={0}>0%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Total - Highlighted */}
              {showTotalColumn && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{t('invoice.totalHeader')}:</span>
                    <span className="text-base sm:text-lg md:text-xl font-bold text-amber-700">
                      {calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="mt-4 sm:mt-6 flex flex-wrap justify-start gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm sm:text-base"
              title={t('invoice.addLine')}
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="hidden sm:inline">{t('invoice.addLine')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCatalogueModal(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
              title={t('invoice.productCatalogue')}
            >
              <BookOpen className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="hidden sm:inline">{t('invoice.productCatalogue')}</span>
            </button>
          </div>
        )}
      </div>

      <ProductCatalogueModal
        isOpen={showCatalogueModal}
        onClose={() => setShowCatalogueModal(false)}
        onItemsChange={handleCatalogueItemsChange}
        currentItems={items}
        type={direction}
      />
    </>
  );
}
