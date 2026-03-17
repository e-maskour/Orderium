import { useState, useEffect } from 'react';
import { IProduct } from '../modules/products/products.interface';
import { productsService } from '../modules/products/products.service';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';

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

  const headerContent = (
    <div>
      <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#0f172a' }}>Catalogue des produits</div>
      <div style={{ fontSize: '0.875rem', color: '#475569' }}>
        {currentItems.filter(item => item.productId).length} produit(s) sélectionné(s)
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex justify-content-end">
      <Button label="Terminé" onClick={handleClose} />
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={handleClose}
      header={headerContent}
      footer={footerContent}
      modal
      dismissableMask
      style={{ width: '95vw', maxWidth: '56rem' }}
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ padding: 0, overflowY: 'auto' }}
    >
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <InputText
          placeholder="Rechercher un produit..."
          value={catalogueSearch}
          onChange={(e) => setCatalogueSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ overflowY: 'auto', padding: '1rem' }}>
        {catalogueLoading ? (
          <div className="flex align-items-center justify-content-center" style={{ padding: '2rem 0' }}>
            <ProgressSpinner style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex align-items-center justify-content-center" style={{ padding: '2rem 0', color: '#475569' }}>
            Aucun produit trouvé
          </div>
        ) : (
          <div className="flex flex-column gap-2">
            {filteredProducts.map((product) => {
              const currentQuantity = getProductQuantity(product.id);
              const isSelected = currentQuantity > 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (!isSelected) {
                      updateProductQuantity(product, 1);
                    }
                  }}
                  className="flex align-items-center justify-content-between"
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${isSelected ? '#fcd34d' : '#e2e8f0'}`,
                    borderRadius: '0.5rem',
                    background: isSelected ? '#fffbeb' : 'transparent',
                    cursor: isSelected ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: isSelected ? '#92400e' : '#0f172a' }}>
                      {product.name}
                    </div>
                    {product.code && (
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Code: {product.code}</div>
                    )}
                    {product.description && (
                      <div style={{ fontSize: '0.875rem', color: '#475569' }}>{product.description}</div>
                    )}
                  </div>

                  <div className="flex align-items-center gap-3">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {(isVente ? product.price : (product.cost || product.price)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </div>
                      {product.stock !== undefined && (
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Stock: {product.stock}</div>
                      )}
                    </div>

                    {isSelected && (
                      <InputNumber
                        value={currentQuantity}
                        onValueChange={(e) => {
                          const newQuantity = Math.max(0, e.value || 0);
                          updateProductQuantity(product, newQuantity);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        min={0}
                        showButtons
                        buttonLayout="horizontal"
                        incrementButtonIcon="pi pi-plus"
                        decrementButtonIcon="pi pi-minus"
                        style={{ width: '6rem' }}
                        inputStyle={{ textAlign: 'center', width: '2.5rem' }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}