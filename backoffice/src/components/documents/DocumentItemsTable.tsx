import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { Dropdown as PrDropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { DocumentItem } from '../../modules/documents/types';
import { calculateItemTotal } from '../../modules/documents/hooks';
import { IProduct } from '../../modules/products/products.interface';
import { productsService } from '../../modules/products/products.service';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCatalogueModal } from '../ProductCatalogueModal';

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

  const [products, setProducts] = useState<IProduct[]>([]);
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
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1.5px solid #e2e8f0', padding: '1rem', overflow: 'visible', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <div style={{ width: '2rem', height: '2rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }}>
            <BookOpen style={{ width: '1rem', height: '1rem', color: '#fff' }} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{t('invoice.articlesTitle')}</h3>
        </div>

        {/* Desktop Table View - Hidden on mobile and tablet */}
        <div className="hidden lg:block" style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table style={{ width: '100%', overflow: 'visible' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '35%', minWidth: '240px' }}>
                  {t('invoice.descriptionHeader')}
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '6rem' }}>
                  {t('invoice.quantityHeader')}
                </th>
                {showPriceColumn && (
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '14rem' }}>
                    {t('invoice.unitPriceHeader')}
                  </th>
                )}
                {showDiscountColumn && (
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '4rem' }}>
                    {t('invoice.discountHeader')}
                  </th>
                )}
                {showTaxColumn && (
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '8rem' }}>
                    {t('invoice.tax')}
                  </th>
                )}
                {showTotalColumn && (
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: '8rem' }}>
                    {t('invoice.totalHeader')}
                  </th>
                )}
                <th style={{ width: '2.5rem' }}></th>
              </tr>
            </thead>
            <tbody style={{ overflow: 'visible' }}>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', overflow: 'visible' }}>
                  <td style={{ padding: '0.75rem', width: '35%', minWidth: '240px', overflow: 'visible' }}>
                    <PrDropdown
                      value={item.productId ? String(item.productId) : null}
                      options={products.map(product => ({
                        value: String(product.id),
                        label: product.name
                      }))}
                      onChange={(e) => handleSelectProduct(item.id, e.value)}
                      optionLabel="label"
                      optionValue="value"
                      placeholder={t('invoice.itemDescriptionPlaceholder')}
                      emptyFilterMessage={t('invoice.noProductsFound')}
                      disabled={readOnly}
                      filter
                      showClear
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <InputText
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={String(item.quantity)}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem' }}
                    />
                  </td>
                  {showPriceColumn && (
                    <td style={{ padding: '0.75rem' }}>
                      <InputText
                        type="number"
                        min={0}
                        step={0.1}
                        value={String(item.unitPrice)}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem' }}
                      />
                    </td>
                  )}
                  {showDiscountColumn && (
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <InputNumber
                          min={0}
                          step={0.1}
                          value={item.discount}
                          onValueChange={(e) => handleItemChange(item.id, 'discount', e.value ?? 0)}
                          inputStyle={{ width: '3.5rem', flex: 'none', padding: '0.5rem', fontSize: '0.875rem', textAlign: 'center', border: 'none', outline: 'none', opacity: readOnly ? 0.5 : 1, boxShadow: 'none' }}
                          disabled={readOnly}
                          pt={{ root: { style: { border: 'none' } } }}
                        />
                        <button
                          type="button"
                          onClick={() => !readOnly && handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)}
                          style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', color: '#334155', fontSize: '0.75rem', fontWeight: 500, minWidth: '40px', border: 'none', cursor: readOnly ? 'default' : 'pointer' }}
                          disabled={readOnly}
                        >
                          {item.discountType === 0 ? 'DH' : '%'}
                        </button>
                      </div>
                    </td>
                  )}
                  {showTaxColumn && (
                    <td style={{ padding: '0.75rem' }}>
                      <PrDropdown
                        value={item.tax}
                        options={[
                          { label: '0%', value: 0 },
                          { label: '10%', value: 10 },
                          { label: '20%', value: 20 },
                        ]}
                        onChange={(e) => handleItemChange(item.id, 'tax', e.value)}
                        optionLabel="label"
                        optionValue="value"
                        disabled={readOnly}
                        style={{ width: '100%', fontSize: '0.875rem' }}
                      />
                    </td>
                  )}
                  {showTotalColumn && (
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ textAlign: 'center', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                        {calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '0.75rem' }}>
                    {!readOnly && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ padding: '0.5rem', color: '#dc2626', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View - Shown on mobile and tablet */}
        <div className="lg:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, index) => (
            <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', background: 'linear-gradient(to bottom right, #f8fafc, #ffffff)' }}>
              {/* Item Number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  Item {index + 1}
                </h4>
                {!readOnly && items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{ padding: '0.375rem', color: '#dc2626', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 style={{ width: '1rem', height: '1rem' }} />
                  </button>
                )}
              </div>

              {/* Description Field */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                    {t('invoice.descriptionHeader')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <PrDropdown
                    value={item.productId ? String(item.productId) : null}
                    options={products.map(product => ({
                      value: String(product.id),
                      label: product.name
                    }))}
                    onChange={(e) => handleSelectProduct(item.id, e.value)}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={t('invoice.itemDescriptionPlaceholder')}
                    emptyFilterMessage={t('invoice.noProductsFound')}
                    disabled={readOnly}
                    filter
                    showClear
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Quantity & Unit Price - Side by side on mobile */}
              <div style={{ display: 'grid', gridTemplateColumns: showPriceColumn ? '1fr 2fr' : '1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                    {t('invoice.quantityHeader')}
                  </label>
                  <InputText
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={String(item.quantity)}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    style={{ width: '100%', textAlign: 'center' }}
                  />
                </div>
                {showPriceColumn && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                      {t('invoice.unitPriceHeader')}
                    </label>
                    <InputText
                      type="number"
                      min={0}
                      step={0.1}
                      value={String(item.unitPrice)}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      style={{ width: '100%', textAlign: 'center' }}
                    />
                  </div>
                )}
              </div>

              {/* Discount & Tax - Side by side on mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {showDiscountColumn && (
                  <div style={{ display: 'grid', gridTemplateColumns: showTaxColumn ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                        {t('invoice.discountHeader')}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <InputNumber
                          min={0}
                          step={0.1}
                          value={item.discount}
                          onValueChange={(e) => handleItemChange(item.id, 'discount', e.value ?? 0)}
                          inputStyle={{ flex: 1, padding: '0.625rem', fontSize: '0.875rem', textAlign: 'center', border: 'none', outline: 'none', opacity: readOnly ? 0.5 : 1, boxShadow: 'none' }}
                          disabled={readOnly}
                          pt={{ root: { style: { border: 'none', flex: 1 } } }}
                        />
                        <button
                          type="button"
                          onClick={() => !readOnly && handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)}
                          style={{ padding: '0.625rem 0.5rem', backgroundColor: '#f1f5f9', color: '#334155', fontSize: '0.75rem', fontWeight: 500, minWidth: '44px', border: 'none', cursor: readOnly ? 'default' : 'pointer' }}
                          disabled={readOnly}
                        >
                          {item.discountType === 0 ? 'DH' : '%'}
                        </button>
                      </div>
                    </div>
                    {showTaxColumn && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                          {t('invoice.tax')}
                        </label>
                        <PrDropdown
                          value={item.tax}
                          options={[
                            { label: '0%', value: 0 },
                            { label: '10%', value: 10 },
                            { label: '20%', value: 20 },
                          ]}
                          onChange={(e) => handleItemChange(item.id, 'tax', e.value)}
                          optionLabel="label"
                          optionValue="value"
                          disabled={readOnly}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {showDiscountColumn === false && showTaxColumn && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                      {t('invoice.tax')}
                    </label>
                    <PrDropdown
                      value={item.tax}
                      options={[
                        { label: '0%', value: 0 },
                        { label: '10%', value: 10 },
                        { label: '20%', value: 20 },
                      ]}
                      onChange={(e) => handleItemChange(item.id, 'tax', e.value)}
                      optionLabel="label"
                      optionValue="value"
                      disabled={readOnly}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Total - Highlighted */}
              {showTotalColumn && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', background: 'linear-gradient(to right, #fffbeb, #fff7ed)', margin: '0.75rem -0.75rem 0', padding: '0.625rem 0.75rem', borderRadius: '0 0 0.5rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('invoice.totalHeader')}:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#b45309' }}>
                      {calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleAddItem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }}
            >
              <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
              {t('invoice.addLine')}
            </button>
            <button
              type="button"
              onClick={() => setShowCatalogueModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#fff', color: '#475569', borderRadius: '0.625rem', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
            >
              <BookOpen style={{ width: '0.875rem', height: '0.875rem' }} />
              {t('invoice.productCatalogue')}
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
