import { useState, useEffect } from 'react';
import { IProduct } from '../modules/products/products.interface';
import { productsService } from '../modules/products/products.service';
import { Input } from './ui/input';
import { Button } from './ui/button';

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

  // Get quantity for a product from current items
  const getProductQuantity = (productId: number): number => {
    const item = currentItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  // Calculate item total
  const calculateItemTotal = (item: InvoiceItemRow): number => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 1
      ? (subtotal * item.discount / 100)
      : item.discount;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax / 100);
    return afterDiscount + taxAmount;
  };

  // Update or add product to items
  const updateProductQuantity = (product: IProduct, newQuantity: number) => {
    let updatedItems = [...currentItems];
    const existingItemIndex = updatedItems.findIndex(item => item.productId === product.id);

    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      if (existingItemIndex !== -1) {
        updatedItems.splice(existingItemIndex, 1);
      }
    } else {
      if (existingItemIndex !== -1) {
        // Update existing item
        const updated = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity
        };
        updated.total = calculateItemTotal(updated);
        updatedItems[existingItemIndex] = updated;
      } else {
        // Add new item
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

  // Load all products for catalogue
  const loadAllProducts = async () => {
    if (allProducts.length > 0) return; // Already loaded

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

  // Load products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllProducts();
    }
  }, [isOpen]);

  // Filter products based on search
  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    product.code?.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    product.description?.toLowerCase().includes(catalogueSearch.toLowerCase())
  );

  // Handle modal close
  const handleClose = () => {
    setCatalogueSearch(''); // Reset search when closing
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] m-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Catalogue des produits</h3>
            <div className="text-sm text-slate-600">
              {currentItems.filter(item => item.productId).length} produit(s) sélectionné(s)
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleClose}>
              Terminé
            </Button>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200">
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            value={catalogueSearch}
            onChange={(e) => setCatalogueSearch(e.target.value)}
            fullWidth
          />
        </div>

        <div className="overflow-y-auto max-h-96 p-4">
          {catalogueLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-600">Chargement des produits...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-600">Aucun produit trouvé</div>
            </div>
          ) : (
            <div className="grid gap-2">
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
                    className={`flex items-center justify-between p-3 border rounded-lg ${isSelected
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                      }`}
                  >
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-amber-800' : 'text-slate-900'
                        }`}>
                        {product.name}
                      </div>
                      {product.code && (
                        <div className="text-sm text-slate-500">Code: {product.code}</div>
                      )}
                      {product.description && (
                        <div className="text-sm text-slate-600">{product.description}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          {(isVente ? product.price : (product.cost || product.price)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                        </div>
                        {product.stock !== undefined && (
                          <div className="text-sm text-slate-500">Stock: {product.stock}</div>
                        )}
                      </div>

                      {isSelected && (
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={currentQuantity}
                          onChange={(e) => {
                            const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                            updateProductQuantity(product, newQuantity);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16"
                          inputSize="sm"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}