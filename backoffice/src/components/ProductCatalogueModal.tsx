import { useState, useEffect } from 'react';
import { IProduct } from '../modules/products/products.interface';
import { productsService } from '../modules/products/products.service';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Search, Package2, Wrench, ShoppingBag } from 'lucide-react';
import { formatAmount } from '@orderium/ui';

const PCAT_STYLES = `
  .pcat-search-wrap {
    padding: 0.625rem 0.875rem;
    background: #f8fafc;
    border-bottom: 1.5px solid #e2e8f0;
    flex-shrink: 0;
    z-index: 20;
  }
  .pcat-search-inner { position: relative; }
  .pcat-search-inner .p-inputtext { padding-left: 2.25rem !important; width: 100%; border-radius: 0.5rem !important; height: 2.5rem !important; font-size: 0.875rem !important; }
  .pcat-search-icon { position: absolute; left: 0.625rem; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 1; }
  .pcat-scroll-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .pcat-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.375rem;
    padding: 0.625rem;
  }
  @media (min-width: 480px) { .pcat-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; padding: 0.75rem; } }
  .pcat-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 0.625rem;
    background: #ffffff;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    user-select: none;
    min-height: 3rem;
    overflow: hidden;
  }
  @media (max-width: 479px) {
    .pcat-card { gap: 0.375rem; padding: 0.5rem; }
    .pcat-right { gap: 0.125rem; }
    .pcat-price { font-size: 0.8125rem !important; }
    .pcat-qty .p-inputnumber-input { width: 1.75rem !important; font-size: 0.75rem !important; }
    .pcat-qty .p-button { width: 1.375rem !important; height: 1.5rem !important; }
  }
  .pcat-card:hover:not(.pcat-selected) {
    border-color: #94a3b8;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    background: #f8fafc;
  }
  .pcat-selected {
    border-color: #235ae4;
    background: #f0f6ff;
    cursor: default;
    box-shadow: 0 2px 10px rgba(35,90,228,0.12);
  }
  .pcat-thumb {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pcat-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .pcat-selected .pcat-name { color: #1d4ed8; }
  .pcat-meta { display: flex; align-items: center; gap: 0.375rem; min-width: 0; }
  .pcat-code {
    display: inline-flex; align-items: center;
    padding: 0.0625rem 0.375rem;
    background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 3px;
    font-size: 0.6875rem; font-weight: 700; color: #64748b; white-space: nowrap; flex-shrink: 0;
  }
  .pcat-selected .pcat-code { background: #dbeafe; border-color: #bfdbfe; color: #1d4ed8; }
  .pcat-desc { font-size: 0.75rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .pcat-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; flex-shrink: 0; }
  .pcat-price { font-size: 0.875rem; font-weight: 800; color: #0f172a; white-space: nowrap; }
  .pcat-selected .pcat-price { color: #1d4ed8; }
  .pcat-price-dim { font-size: 0.6875rem; font-weight: 500; color: #94a3b8; margin-left: 0.125rem; }
  .pcat-stock {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.125rem 0.375rem; border-radius: 99px;
    font-size: 0.625rem; font-weight: 700;
  }
  .pcat-stock-ok { background: #f0fdf4; color: #16a34a; }
  .pcat-stock-low { background: #fff7ed; color: #ea580c; }
  .pcat-stock-zero { background: #fef2f2; color: #dc2626; }
  .pcat-check {
    flex-shrink: 0; width: 1.125rem; height: 1.125rem; border-radius: 50%;
    background: linear-gradient(135deg, #235ae4, #1a47b8);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 5px rgba(35,90,228,0.4);
  }
  .pcat-qty { display: flex; align-items: center; }
  .pcat-qty .p-inputnumber { height: 1.75rem; }
  .pcat-qty .p-inputnumber-input { width: 2rem !important; text-align: center !important; padding: 0.125rem 0.125rem !important; font-weight: 700 !important; font-size: 0.8125rem !important; height: 1.75rem !important; }
  .pcat-qty .p-button { width: 1.5rem !important; height: 1.75rem !important; padding: 0 !important; }
  .pcat-name { font-size: 0.8125rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .pcat-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.0625rem; overflow: hidden; }
  .pcat-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2.5rem 1rem; gap: 0.625rem;
  }
  .pcat-empty-icon {
    width: 3rem; height: 3rem; border-radius: 50%;
    background: #f1f5f9; display: flex; align-items: center; justify-content: center;
  }
  .p-dialog-footer { width: 100% !important; }
`;

interface InvoiceItemRow {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

interface ProductCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsChange: (items: InvoiceItemRow[]) => void;
  currentItems: InvoiceItemRow[];
  type?: 'vente' | 'achat';
}

export function ProductCatalogueModal({
  isOpen,
  onClose,
  onItemsChange,
  currentItems,
  type = 'vente'
}: ProductCatalogueModalProps) {
  const [allProducts, setAllProducts] = useState<IProduct[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');

  const isVente = type === 'vente';

  const getProductQuantity = (productId: number): number => {
    const item = currentItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const calculateItemTotal = (item: InvoiceItemRow): number => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 1
      ? (subtotal * item.discount / 100)
      : item.discount;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax / 100);
    return afterDiscount + taxAmount;
  };

  const updateProductQuantity = (product: IProduct, newQuantity: number) => {
    const updatedItems = [...currentItems];
    const existingItemIndex = updatedItems.findIndex(item => item.productId === product.id);

    if (newQuantity <= 0) {
      if (existingItemIndex !== -1) {
        updatedItems.splice(existingItemIndex, 1);
      }
    } else {
      if (existingItemIndex !== -1) {
        const updated = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity
        };
        updated.total = calculateItemTotal(updated);
        updatedItems[existingItemIndex] = updated;
      } else {
        const newItem: InvoiceItemRow = {
          id: String(updatedItems.length + 1),
          productId: product.id,
          description: product.name,
          quantity: newQuantity,
          unitPrice: isVente ? product.price : (product.cost || product.price),
          discount: 0,
          discountType: 0,
          tax: (isVente ? product.saleTax : product.purchaseTax) || 0,
          total: 0
        };
        newItem.total = calculateItemTotal(newItem);
        updatedItems.push(newItem);
      }
    }

    onItemsChange(updatedItems);
  };

  const loadAllProducts = async () => {
    if (allProducts.length > 0) return;
    try {
      setCatalogueLoading(true);
      const response = await productsService.getProducts({ limit: 1000 });
      setAllProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setCatalogueLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllProducts();
    }
  }, [isOpen]);

  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    product.code?.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    product.description?.toLowerCase().includes(catalogueSearch.toLowerCase())
  );

  const handleClose = () => {
    setCatalogueSearch('');
    onClose();
  };

  const selectedCount = currentItems.filter(item => item.productId).length;

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '2.5rem', height: '2.5rem', flexShrink: 0,
        background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
        borderRadius: '0.6875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 10px rgba(35,90,228,0.4)'
      }}>
        <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a' }}>Catalogue des produits</div>
        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.125rem' }}>
          {selectedCount > 0
            ? <span style={{ color: '#235ae4', fontWeight: 600 }}>{selectedCount} produit{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}</span>
            : 'Sélectionnez des produits à ajouter'
          }
        </div>
      </div>
    </div>
  );

  const footerContent = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.25rem 0' }}>
      <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} affiché{filteredProducts.length !== 1 ? 's' : ''}
      </span>
      <Button
        label="Terminé"
        onClick={handleClose}
        style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none', boxShadow: '0 2px 8px rgba(35,90,228,0.35)', fontWeight: 600 }}
      />
    </div>
  );

  const getStockBadge = (stock?: number | null) => {
    if (stock === undefined || stock === null) return null;
    const cls = stock === 0 ? 'pcat-stock pcat-stock-zero' : stock <= 5 ? 'pcat-stock pcat-stock-low' : 'pcat-stock pcat-stock-ok';
    return <span className={cls}>Stock: {stock}</span>;
  };

  return (
    <Dialog
      visible={isOpen}
      onHide={handleClose}
      header={headerContent}
      footer={footerContent}
      modal
      dismissableMask
      style={{ width: '95vw', maxWidth: '58rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      contentStyle={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(80vh - 9rem)' }}
    >
      <style>{PCAT_STYLES}</style>

      {/* ── Sticky search bar ── */}
      <div className="pcat-search-wrap">
        <div className="pcat-search-inner">
          <Search className="pcat-search-icon" style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
          <InputText
            placeholder="Rechercher un produit..."
            value={catalogueSearch}
            onChange={(e) => setCatalogueSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="pcat-scroll-area">
        {catalogueLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="pcat-empty">
            <div className="pcat-empty-icon">
              <Package2 style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8' }} />
            </div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#64748b' }}>Aucun produit trouvé</span>
            {catalogueSearch && (
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Essayez un autre terme de recherche</span>
            )}
          </div>
        ) : (
          <div className="pcat-grid">
            {filteredProducts.map((product) => {
              const currentQuantity = getProductQuantity(product.id);
              const isSelected = currentQuantity > 0;
              const displayPrice = formatAmount(isVente ? product.price : (product.cost || product.price), 2);

              return (
                <div
                  key={product.id}
                  className={`pcat-card${isSelected ? ' pcat-selected' : ''}`}
                  onClick={() => { if (!isSelected) updateProductQuantity(product, 1); }}
                >
                  {/* Thumbnail */}
                  <div
                    className="pcat-thumb"
                    style={{
                      background: product.imageUrl
                        ? undefined
                        : product.isService
                          ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                          : 'linear-gradient(135deg, #235ae4, #1a47b8)'
                    }}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : product.isService ? (
                      <Wrench style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                    ) : (
                      <Package2 style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                    )}
                  </div>

                  {/* Body */}
                  <div className="pcat-body">
                    <span className="pcat-name" title={product.name}>{product.name}</span>
                    {product.code && (
                      <div className="pcat-meta">
                        <span className="pcat-code">#{product.code}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: price + stock/qty + check */}
                  <div className="pcat-right">
                    <span className="pcat-price">
                      {displayPrice}<span className="pcat-price-dim">DH</span>
                    </span>
                    {!isSelected ? (
                      getStockBadge(product.stock)
                    ) : (
                      <div className="pcat-qty" onClick={(e) => e.stopPropagation()}>
                        <InputNumber
                          value={currentQuantity}
                          onValueChange={(e) => updateProductQuantity(product, Math.max(0, e.value || 0))}
                          min={0}
                          showButtons
                          buttonLayout="horizontal"
                          incrementButtonIcon="pi pi-plus"
                          decrementButtonIcon="pi pi-minus"
                          style={{ width: '6.5rem' }}
                          inputStyle={{ textAlign: 'center', width: '2rem', fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="pcat-check">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}