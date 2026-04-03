import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, BookOpen, Hash, Package2 } from 'lucide-react';
import { Dropdown as PrDropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { ColumnBodyOptions } from 'primereact/column';
import { DocumentItem } from '../../modules/documents/types';
import { calculateItemTotal } from '../../modules/documents/hooks';
import { IProduct } from '../../modules/products/products.interface';
import { productsService } from '../../modules/products/products.service';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCatalogueModal } from '../ProductCatalogueModal';
import { formatAmount } from '@orderium/ui';

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

const DIT_STYLES = `
  .dit-wrap { border-radius: 1rem; border: 1.5px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.07); background: #fff; }
  .dit-thead-row { background: linear-gradient(to right, #f8fafc, #f1f5f9); border-bottom: 2px solid #e2e8f0; }
  .dit-tbody-row { transition: background 0.12s; border-bottom: 1px solid #f0f4f8; }
  .dit-tbody-row.row-odd { background: #ffffff; }
  .dit-tbody-row.row-even { background: #fafbfc; }
  .dit-tbody-row:hover { background: #f0f7ff !important; }
  .dit-row-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.625rem; height: 1.625rem;
    background: #f1f5f9; color: #94a3b8;
    border-radius: 50%; font-size: 0.75rem; font-weight: 700;
    transition: background 0.15s, color 0.15s;
  }
  .dit-tbody-row:hover .dit-row-num { background: linear-gradient(135deg, #235ae4, #1a47b8); color: #fff; }
  .dit-wrap .p-datatable .p-datatable-thead > tr > th { background: transparent !important; }
  .dit-wrap .p-datatable .p-datatable-tbody > tr { transition: background 0.12s; border-bottom: 1px solid #f0f4f8; }
  .dit-wrap .p-datatable-wrapper { overflow: visible !important; }
  .dit-wrap .p-datatable table, .dit-wrap .p-datatable td, .dit-wrap .p-datatable th { font-family: inherit !important; font-size: 0.875rem !important; }
  .dit-wrap table, .dit-wrap .p-datatable table, .dit-wrap td, .dit-wrap th, .dit-wrap input, .dit-wrap .p-dropdown, .dit-wrap .p-inputtext { font-family: inherit !important; font-size: 0.875rem !important; }
  .dit-wrap .dit-al .p-column-header-content { justify-content: flex-start !important; }
  .dit-wrap .dit-ac .p-column-header-content { justify-content: center !important; }
  .dit-wrap .dit-ar .p-column-header-content { justify-content: flex-end !important; }
  .dit-wrap .p-datatable .p-datatable-thead > tr > th.dit-al,
  .dit-wrap .p-datatable .p-datatable-tbody > tr > td.dit-al { text-align: left !important; }
  .dit-wrap .p-datatable .p-datatable-thead > tr > th.dit-ac,
  .dit-wrap .p-datatable .p-datatable-tbody > tr > td.dit-ac { text-align: center !important; }
  .dit-wrap .p-datatable .p-datatable-thead > tr > th.dit-ar,
  .dit-wrap .p-datatable .p-datatable-tbody > tr > td.dit-ar { text-align: right !important; }
  .dit-dg .p-dropdown {
    border: 1.5px solid transparent !important; background: transparent !important;
    transition: border-color 0.15s, box-shadow 0.15s; border-radius: 6px !important;
  }
  .dit-dg .p-dropdown:hover:not(.p-disabled) { border-color: #e2e8f0 !important; background: #fff !important; }
  .dit-dg .p-dropdown.p-focus, .dit-dg .p-dropdown:focus-within { border-color: var(--form-input-border-focus) !important; background: #fff !important; box-shadow: var(--form-input-shadow-focus) !important; }
  .dit-ig .p-inputtext {
    border: 1.5px solid transparent !important; background: transparent !important;
    padding: 0.4rem 0.5rem !important; font-size: 0.875rem !important;
    height: 2.5rem !important; text-align: center !important; color: #1e293b !important; font-weight: 600 !important;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; border-radius: 6px !important;
  }
  .dit-ig .p-inputtext:hover:not([disabled]) { border-color: #e2e8f0 !important; background: #fff !important; }
  .dit-ig .p-inputtext:focus { border-color: var(--form-input-border-focus) !important; background: #fff !important; box-shadow: var(--form-input-shadow-focus) !important; }
  .dit-ig .p-inputtext[type=number]::-webkit-inner-spin-button,
  .dit-ig .p-inputtext[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .dit-ig .p-inputtext[type=number] { -moz-appearance: textfield; }
  .dit-dg .p-dropdown { height: 2.5rem !important; }
  .dit-dg .p-dropdown .p-dropdown-label { display: flex !important; align-items: center !important; text-align: center !important; justify-content: center !important; color: #1e293b !important; font-weight: 600 !important; font-size: 0.875rem !important; }
  .dit-dsc {
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    border: 1.5px solid transparent; border-radius: 6px; background: transparent;
    width: 100%; height: 2.5rem;
    transition: border-color 0.15s, background 0.15s;
  }
  .dit-dsc:hover { border-color: #e2e8f0 !important; background: #fff !important; }
  .dit-dsc:focus-within { border-color: var(--form-input-border-focus) !important; background: #fff !important; box-shadow: var(--form-input-shadow-focus) !important; }
  .dit-dsc .p-inputnumber-input { width: 3.5rem !important; border: none !important; background: transparent !important; padding: 0.4rem 0.25rem !important; font-size: 0.875rem !important; text-align: center !important; box-shadow: none !important; }
  .dit-dsc .p-inputnumber-input::-webkit-inner-spin-button,
  .dit-dsc .p-inputnumber-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .dit-dsc .p-inputnumber-input { -moz-appearance: textfield; }
  .dit-dtb { padding: 0.3rem 0.5rem; min-width: 36px; border: none; cursor: pointer; background: #f1f5f9; color: #475569; font-size: 0.7rem; font-weight: 700; transition: background 0.15s; }
  .dit-dtb:hover:not(:disabled) { background: #e2e8f0; }
  .dit-del {
    display: flex; align-items: center; justify-content: center;
    width: 1.75rem; height: 1.75rem; border-radius: 6px;
    border: 1.5px solid #fecaca; background: #fff5f5; color: #dc2626;
    cursor: pointer; transition: all 0.15s; opacity: 0;
  }
  .dit-tbody-row:hover .dit-del { opacity: 1; }
  .dit-del:hover { background: #dc2626 !important; color: #fff !important; border-color: #dc2626 !important; }
  .dit-btn-add {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; background: linear-gradient(135deg, #235ae4, #1a47b8);
    color: #fff; border: none; border-radius: 8px; font-size: 0.8125rem; font-weight: 600;
    cursor: pointer; box-shadow: 0 2px 8px rgba(35,90,228,0.3);
    transition: transform 0.15s, box-shadow 0.15s; white-space: nowrap;
  }
  .dit-btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(35,90,228,0.4); }
  .dit-btn-cat {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; background: #f1f5f9;
    color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px;
    font-size: 0.8125rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s, border-color 0.15s; white-space: nowrap;
  }
  .dit-btn-cat:hover { background: #e2e8f0; border-color: #94a3b8; color: #1e293b; }
  .dit-mob-card { border: 1.5px solid #e2e8f0; border-radius: 0.875rem; overflow: hidden; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.05); }
  .dit-mob-hdr { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 0.875rem; background: linear-gradient(to right, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; }
  .dit-mob-body { padding: 0.875rem; }
  .dit-mob-total { margin-top: 0.875rem; padding: 0.625rem 0.875rem; background: linear-gradient(to right, #f8fafc, #f1f5f9); border: 1.5px solid #e2e8f0; border-radius: 0.5rem; display: flex; align-items: center; justify-content: space-between; }
  .dit-field-label { display: block; font-size: 0.6875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.25rem; }
  @media (max-width: 1023px) { .dit-desktop { display: none !important; } .dit-mobile { display: flex !important; } }
  @media (min-width: 1024px) { .dit-desktop { display: block !important; } .dit-mobile { display: none !important; } }
`;

export function DocumentItemsTable({
  items,
  direction,
  readOnly = false,
  onItemsChange,
  showTaxColumn = true,
  showDiscountColumn = true,
  showPriceColumn = true,
  showTotalColumn = true,
}: DocumentItemsTableProps) {
  const { t, language } = useLanguage();
  const isVente = direction === 'vente';
  const currency = language === 'ar' ? 'د.م' : 'DH';

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

  const grandTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddItem = () => {
    const newId = `new_${Date.now()}`;
    const newItems = [
      ...items,
      {
        id: newId,
        productId: undefined,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: 0,
        tax: 0,
        total: 0,
      },
    ];
    onItemsChange(newItems);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      onItemsChange(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof DocumentItem, value: any) => {
    const newItems = items.map((item) => {
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
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingItemIndex = items.findIndex((item) => item.productId === product.id);

    if (existingItemIndex !== -1) {
      const updatedItems = items.map((item, index) => {
        if (index === existingItemIndex) {
          const updated = {
            ...item,
            quantity: item.quantity + 1,
          };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      });
      onItemsChange(updatedItems);
    } else {
      const newItems = items.map((item) => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            productId: product.id,
            description: product.name,
            unitPrice: isVente ? product.price : product.cost || product.price,
            tax: (isVente ? product.saleTax : product.purchaseTax) || 0,
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

  // Build dropdown options for a row, injecting the current product as a synthetic
  // option when it wasn't included in the first page of loaded products.
  const getDropdownOptions = useCallback(
    (item: DocumentItem) => {
      const opts = products.map((p) => ({ value: String(p.id), label: p.name }));
      if (item.productId && !products.some((p) => p.id === item.productId)) {
        opts.unshift({
          value: String(item.productId),
          label: item.description || `#${item.productId}`,
        });
      }
      return opts;
    },
    [products],
  );

  return (
    <>
      <style>{DIT_STYLES}</style>
      <div className="dit-wrap">
        {/* ── Panel Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
            borderBottom: '1.5px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                borderRadius: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(35,90,228,0.4)',
              }}
            >
              <BookOpen style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                {t('invoice.articlesTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {items.length} {t('items')}
                {showTotalColumn && ` — ${formatAmount(grandTotal)} ${currency}`}
              </p>
            </div>
          </div>
          {!readOnly && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="dit-btn-add" onClick={handleAddItem}>
                <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
                {t('invoice.addLine')}
              </button>
              <button className="dit-btn-cat" onClick={() => setShowCatalogueModal(true)}>
                <Package2 style={{ width: '0.875rem', height: '0.875rem' }} />
                {t('invoice.productCatalogue')}
              </button>
            </div>
          )}
        </div>

        {/* ── Desktop Table ── */}
        <div className="dit-desktop" style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <DataTable
            value={items}
            dataKey="id"
            size="small"
            rowClassName={(item: DocumentItem) => {
              const idx = items.indexOf(item);
              return `dit-tbody-row ${idx % 2 === 0 ? 'row-odd' : 'row-even'}`;
            }}
            tableStyle={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
            pt={{
              wrapper: { style: { overflow: 'visible' } },
              table: { style: { overflow: 'visible' } },
            }}
          >
            {/* # */}
            <Column
              style={{ width: '3rem' }}
              headerClassName="dit-ac"
              headerStyle={{
                padding: '0.625rem 0.5rem',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderBottom: '2px solid #e2e8f0',
              }}
              bodyClassName="dit-ac"
              bodyStyle={{ padding: '0.5rem 0.5rem' }}
              header={
                <Hash
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    color: '#94a3b8',
                    display: 'inline-block',
                  }}
                />
              }
              body={(_item: DocumentItem, options: ColumnBodyOptions) => (
                <span className="dit-row-num">{options.rowIndex + 1}</span>
              )}
            />

            {/* Description */}
            <Column
              field="description"
              style={{ width: '22%' }}
              headerClassName="dit-al"
              headerStyle={{
                padding: '0.625rem 0.75rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderBottom: '2px solid #e2e8f0',
              }}
              bodyStyle={{ padding: '0.5rem 0.75rem', overflow: 'visible' }}
              bodyClassName="dit-dg dit-al"
              header={t('invoice.descriptionHeader')}
              body={(item: DocumentItem) =>
                readOnly ? (
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                    {item.productId
                      ? (products.find((p) => p.id === item.productId)?.name ?? item.description)
                      : item.description || '—'}
                  </span>
                ) : (
                  <PrDropdown
                    value={item.productId ? String(item.productId) : null}
                    options={getDropdownOptions(item)}
                    onChange={(e) => handleSelectProduct(item.id, e.value)}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={t('invoice.itemDescriptionPlaceholder')}
                    emptyFilterMessage={t('invoice.noProductsFound')}
                    filter
                    showClear
                    style={{ width: '100%', fontSize: '0.875rem' }}
                  />
                )
              }
            />

            {/* Quantity */}
            <Column
              field="quantity"
              style={{ width: '7rem' }}
              headerClassName="dit-ac"
              headerStyle={{
                padding: '0.625rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderBottom: '2px solid #e2e8f0',
              }}
              bodyStyle={{ padding: '0.5rem 0.25rem' }}
              bodyClassName="dit-ig dit-ac"
              header={t('invoice.quantityHeader')}
              body={(item: DocumentItem) =>
                readOnly ? (
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                    {item.quantity}
                  </span>
                ) : (
                  <InputText
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={String(item.quantity)}
                    onChange={(e) =>
                      handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                    }
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      color: '#1e293b',
                      fontWeight: 600,
                    }}
                  />
                )
              }
            />

            {/* Unit Price */}
            {showPriceColumn && (
              <Column
                field="unitPrice"
                style={{ width: '9.5rem' }}
                headerClassName="dit-ac"
                headerStyle={{
                  padding: '0.625rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  borderBottom: '2px solid #e2e8f0',
                }}
                bodyStyle={{ padding: '0.5rem 0.25rem' }}
                bodyClassName="dit-ig dit-ac"
                header={t('invoice.unitPriceHeader')}
                body={(item: DocumentItem) =>
                  readOnly ? (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatAmount(item.unitPrice)}
                    </span>
                  ) : (
                    <InputText
                      type="number"
                      min={0}
                      step={0.01}
                      value={String(item.unitPrice)}
                      onChange={(e) =>
                        handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: '#1e293b',
                        fontWeight: 600,
                      }}
                    />
                  )
                }
              />
            )}

            {/* Discount */}
            {showDiscountColumn && (
              <Column
                field="discount"
                style={{ width: '9rem' }}
                headerClassName="dit-ac"
                headerStyle={{
                  padding: '0.625rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  borderBottom: '2px solid #e2e8f0',
                }}
                bodyClassName="dit-ac"
                bodyStyle={{ padding: '0.5rem 0.25rem' }}
                header={t('invoice.discountHeader')}
                body={(item: DocumentItem) =>
                  readOnly ? (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.discount}
                      {item.discountType === 0 ? ` ${currency}` : '%'}
                    </span>
                  ) : (
                    <div className="dit-dsc">
                      <InputNumber
                        min={0}
                        step={0.1}
                        value={item.discount}
                        onValueChange={(e) => handleItemChange(item.id, 'discount', e.value ?? 0)}
                        inputStyle={{
                          width: '3.5rem',
                          border: 'none',
                          background: 'transparent',
                          padding: '0.4rem 0.25rem',
                          fontSize: '0.875rem',
                          textAlign: 'center',
                          boxShadow: 'none',
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                        pt={{ root: { style: { border: 'none', background: 'transparent' } } }}
                      />
                      <Button
                        text
                        type="button"
                        className="dit-dtb"
                        onClick={() =>
                          handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)
                        }
                      >
                        {item.discountType === 0 ? currency : '%'}
                      </Button>
                    </div>
                  )
                }
              />
            )}

            {/* Tax */}
            {showTaxColumn && (
              <Column
                field="tax"
                style={{ width: '7.5rem' }}
                headerClassName="dit-ac"
                headerStyle={{
                  padding: '0.625rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  borderBottom: '2px solid #e2e8f0',
                }}
                bodyStyle={{ padding: '0.5rem 0.25rem' }}
                bodyClassName="dit-dg dit-ac"
                header={t('invoice.tax')}
                body={(item: DocumentItem) =>
                  readOnly ? (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.tax}%
                    </span>
                  ) : (
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
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  )
                }
              />
            )}

            {/* Total */}
            {showTotalColumn && (
              <Column
                field="total"
                style={{ width: '12rem' }}
                headerClassName="dit-ar"
                headerStyle={{
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  borderBottom: '2px solid #e2e8f0',
                }}
                bodyClassName="dit-ar"
                bodyStyle={{ padding: '0.5rem 0.75rem' }}
                header={t('invoice.totalHeader')}
                body={(item: DocumentItem) => (
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatAmount(calculateItemTotal(item))}{' '}
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>
                      {currency}
                    </span>
                  </span>
                )}
              />
            )}

            {/* Delete */}
            <Column
              style={{ width: '3rem' }}
              headerStyle={{
                padding: '0.5rem',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderBottom: '2px solid #e2e8f0',
              }}
              bodyStyle={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}
              body={(item: DocumentItem) =>
                !readOnly && items.length > 1 ? (
                  <button className="dit-del" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                ) : null
              }
            />
          </DataTable>

          {/* Summary Footer Bar */}
          {showTotalColumn && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderTop: '1.5px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                {items.length} {t('items')} · {t('invoice.quantityHeader')}: {totalQty}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                  }}
                >
                  {t('invoice.totalHeader')} HT
                </span>
                <span
                  style={{
                    color: '#235ae4',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {formatAmount(grandTotal)} {currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile Cards ── */}
        <div
          className="dit-mobile"
          style={{ flexDirection: 'column', gap: '0.75rem', padding: '0.875rem', display: 'none' }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="dit-mob-card">
              <div className="dit-mob-hdr">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.5rem',
                      height: '1.5rem',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                      color: '#fff',
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#334155',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.description || t('invoice.itemDescriptionPlaceholder')}
                  </span>
                </div>
                {!readOnly && items.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      flexShrink: 0,
                      padding: 0,
                      borderRadius: '6px',
                      border: '1.5px solid #fecaca',
                      background: '#fff5f5',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                )}
              </div>
              <div className="dit-mob-body">
                {/* Product */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="dit-field-label">{t('invoice.descriptionHeader')}</label>
                  <PrDropdown
                    value={item.productId ? String(item.productId) : null}
                    options={getDropdownOptions(item)}
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
                {/* Qty + Price */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showPriceColumn ? '1fr 1.5fr' : '1fr',
                    gap: '0.625rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label className="dit-field-label">{t('invoice.quantityHeader')}</label>
                    <InputText
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={String(item.quantity)}
                      onChange={(e) =>
                        handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      readOnly={readOnly}
                      style={{ width: '100%', textAlign: 'center' }}
                    />
                  </div>
                  {showPriceColumn && (
                    <div>
                      <label className="dit-field-label">{t('invoice.unitPriceHeader')}</label>
                      <InputText
                        type="number"
                        min={0}
                        step={0.01}
                        value={String(item.unitPrice)}
                        onChange={(e) =>
                          handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        readOnly={readOnly}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
                {/* Discount + Tax */}
                {(showDiscountColumn || showTaxColumn) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: showDiscountColumn && showTaxColumn ? '1fr 1fr' : '1fr',
                      gap: '0.625rem',
                    }}
                  >
                    {showDiscountColumn && (
                      <div>
                        <label className="dit-field-label">{t('invoice.discountHeader')}</label>
                        <div
                          className="dit-dsc"
                          style={{
                            width: '100%',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '6px',
                          }}
                        >
                          <InputNumber
                            min={0}
                            step={0.1}
                            value={item.discount}
                            onValueChange={(e) =>
                              handleItemChange(item.id, 'discount', e.value ?? 0)
                            }
                            inputStyle={{
                              flex: 1,
                              minWidth: 0,
                              border: 'none',
                              background: 'transparent',
                              padding: '0.5rem 0.25rem',
                              fontSize: '0.875rem',
                              textAlign: 'center',
                              boxShadow: 'none',
                            }}
                            readOnly={readOnly}
                            pt={{
                              root: {
                                style: { border: 'none', background: 'transparent', flex: 1 },
                              },
                            }}
                          />
                          <button
                            className="dit-dtb"
                            onClick={() =>
                              !readOnly &&
                              handleItemChange(
                                item.id,
                                'discountType',
                                item.discountType === 0 ? 1 : 0,
                              )
                            }
                            disabled={readOnly}
                          >
                            {item.discountType === 0 ? currency : '%'}
                          </button>
                        </div>
                      </div>
                    )}
                    {showTaxColumn && (
                      <div>
                        <label className="dit-field-label">{t('invoice.tax')}</label>
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
                {/* Total */}
                {showTotalColumn && (
                  <div className="dit-mob-total">
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {t('invoice.totalHeader')} HT
                    </span>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#235ae4' }}>
                      {formatAmount(calculateItemTotal(item))} {currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
