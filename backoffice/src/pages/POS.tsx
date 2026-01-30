import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ShoppingBag, Trash2, User, MapPin, Package, ArrowLeft, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { ProductQuantityModal } from '../components/ProductQuantityModal';
import { PriceConfirmModal } from '../components/PriceConfirmModal';
import { CustomerSelectionModal } from '../components/CustomerSelectionModal';
import { DiscountModal } from '../components/DiscountModal';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId?: number;
  imageUrl?: string;
  isEnabled?: boolean;
  isService?: boolean;
  stock?: number;
  code?: string;
  isPriceChangeAllowed?: boolean;
  saleUnitOfMeasure?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
}

interface Customer {
  id: number;
  name: string;
  phoneNumber: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  discountType: number; // 0 = fixed amount, 1 = percentage
}

export default function POS() {
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();

  // Get API base URL from environment or use window origin
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  // Helper to convert relative image paths to full URLs
  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith('http')) return imageUrl; // Already full URL
    if (imageUrl.startsWith('orderium/')) {
      // Cloudinary
      return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imageUrl}`;
    }
    // Relative path - add API base URL
    return `${apiBaseUrl}/uploads/images/${imageUrl}`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const hasSetDefaultCustomer = useRef(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);

  const formatCurrency = (price: number) => {
    return language === 'ar' 
      ? `${price.toFixed(2)} د.م.`
      : `${price.toFixed(2)} DH`;
  };

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      
      // Transform products with proper type conversion
      if (data.products) {
        data.products = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          price: parseFloat(p.price) || 0,
          cost: p.cost != null ? parseFloat(p.cost) : undefined,
          stock: p.stock != null ? parseInt(p.stock) : undefined,
          isService: p.isService,
          isEnabled: p.isEnabled,
          isPriceChangeAllowed: p.isPriceChangeAllowed,
          categoryId: p.categoryId,
          imageUrl: p.imageUrl,
          saleUnitOfMeasure: p.saleUnitOfMeasure,
        }));
      }
      
      return data;
    },
  });

  const products: Product[] = productsData?.products || [];

  // Fetch all partners to find "Client Comptoir"
  const { data: partnersData } = useQuery({
    queryKey: ['partners-all'],
    queryFn: async () => {
      const response = await fetch('/api/partners?type=customer');
      if (!response.ok) throw new Error('Failed to fetch partners');
      const data = await response.json();
      return data.partners || [];
    },
  });

  // Set "Client Comptoir" as default customer on initial load
  useEffect(() => {
    if (!hasSetDefaultCustomer.current && partnersData && partnersData.length > 0) {
      const comptoirClient = partnersData.find((p: Customer) => p.name === 'Client Comptoir');
      if (comptoirClient) {
        setSelectedCustomer(comptoirClient);
        hasSetDefaultCustomer.current = true;
      }
    }
  }, [partnersData]);

  const filteredProducts = products.filter((p: Product) =>
    p.isEnabled !== false &&
    p.isService !== true &&
    (searchQuery === '' || 
     p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product);
    
    // If price change is allowed, show price confirmation modal first
    if (product.isPriceChangeAllowed) {
      setIsPriceModalOpen(true);
    } else {
      // Otherwise, go directly to quantity modal
      setConfirmedPrice(product.price);
      setIsModalOpen(true);
    }
  };

  const handlePriceConfirm = (price: number) => {
    setConfirmedPrice(price);
    setIsPriceModalOpen(false);
    setIsModalOpen(true);
  };

  const handleAddToCart = (quantity: number) => {
    if (!selectedProduct) return;
    
    // Use confirmed price if available, otherwise use product's original price
    const finalPrice = confirmedPrice !== null ? confirmedPrice : selectedProduct.price;
    const productWithPrice = { ...selectedProduct, price: finalPrice };
    
    const existing = cart.find(item => item.product.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === selectedProduct.id
          ? { ...item, quantity, product: productWithPrice }
          : item
      ));
    } else {
      setCart([...cart, { product: productWithPrice, quantity, discount: 0, discountType: 0 }]);
    }
    
    // Reset confirmed price
    setConfirmedPrice(null);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const openDiscountModal = (item: CartItem) => {
    setSelectedCartItem(item);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscount = (discount: number, discountType: number) => {
    if (!selectedCartItem) return;
    
    setCart(cart.map(item =>
      item.product.id === selectedCartItem.product.id
        ? { ...item, discount, discountType }
        : item
    ));
    
    setSelectedCartItem(null);
    setIsDiscountModalOpen(false);
  };

  const total = cart.reduce((sum, item) => {
    const itemSubtotal = item.product.price * item.quantity;
    const itemDiscount = item.discountType === 1 
      ? (itemSubtotal * item.discount) / 100 
      : item.discount;
    return sum + (itemSubtotal - itemDiscount);
  }, 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: (data) => {
      const orderNumber = data?.order?.orderNumber || data?.orderNumber || data?.documentNumber;
      const orderId = data?.order?.id || data?.id;
      navigate('/checkout/success', {
        state: {
          orderNumber: orderNumber,
          orderId: orderId,
          customer: {
            id: selectedCustomer?.id || 0,
            name: selectedCustomer?.name || '',
            phone: selectedCustomer?.phoneNumber || '',
            address: selectedCustomer?.address,
          },
          items: cart,
          total: total,
          paidAmount: total,
          change: 0,
          orderDate: new Date(),
        }
      });
    },
    onError: (error: any) => {
      toast.error(error.message || t('error'));
    },
  });

  const handleCheckout = () => {
    if (!selectedCustomer) {
      toast.error(t('selectCustomer'));
      return;
    }
    
    if (cart.length === 0) {
      toast.error(t('cartEmpty'));
      return;
    }

    // Navigate to checkout page with cart and customer data
    navigate('/checkout', {
      state: {
        cart: cart,
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          phone: selectedCustomer.phoneNumber,
          address: selectedCustomer.address
        }
      }
    });
  };

  const handleConfirmCash = () => {
    if (!selectedCustomer) {
      toast.error(t('selectCustomer'));
      return;
    }
    
    if (cart.length === 0) {
      toast.error(t('cartEmpty'));
      return;
    }

    const items = cart.map(item => {
      const quantity = item.quantity;
      const unitPrice = item.product.price;
      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount = item.discountType === 1 
        ? (itemSubtotal * item.discount) / 100 
        : item.discount;
      const tax = 0;
      const itemTotal = itemSubtotal - itemDiscountAmount;
      
      return {
        productId: item.product.id,
        description: item.product.name || '',
        quantity: quantity,
        unitPrice: unitPrice,
        discount: itemDiscountAmount,
        discountType: item.discountType,
        tax: tax,
        total: itemTotal
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalTax = 0;
    const totalAmount = subtotal;

    const orderData = {
      customerId: selectedCustomer.id,
      fromPortal: true,
      date: new Date().toISOString(),
      subtotal: subtotal,
      tax: totalTax,
      discount: 0,
      discountType: 0,
      total: totalAmount,
      notes: '',
      items: items
    };

    createOrderMutation.mutate(orderData);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    const newWidth = dir === 'rtl' 
      ? window.innerWidth - e.clientX 
      : e.clientX;
    // Min 280px, Max 600px or 50% of window width
    const minWidth = 280;
    const maxWidth = Math.min(600, window.innerWidth * 0.5);
    setSidebarWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
  };

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, dir]);

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* Header with Back Button */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                <span>{t('back')}</span>
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary" />
                {t('pointOfSale')}
              </h1>
            </div>

            {/* Customer Selection in Header */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors"
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-emerald-900 text-sm">{selectedCustomer.name}</p>
                        <p className="text-xs text-emerald-700">{selectedCustomer.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{t('selectCustomer')}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelectCustomer={handleSelectCustomer}
        selectedCustomer={selectedCustomer}
        t={(key: string) => t(key as any)}
        dir={dir}
      />

      {/* Price Confirmation Modal */}
      <PriceConfirmModal
        product={selectedProduct}
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        onConfirm={handlePriceConfirm}
        language={language}
        t={(key: string) => t(key as any)}
      />

      {/* Product Quantity Modal */}
      <ProductQuantityModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        initialQuantity={cart.find(item => item.product.id === selectedProduct?.id)?.quantity || 0}
        language={language}
        t={(key: string) => t(key as any)}
      />

      {/* Discount Modal */}
      <DiscountModal
        productName={selectedCartItem?.product.name || ''}
        quantity={selectedCartItem?.quantity || 0}
        unitPrice={selectedCartItem?.product.price || 0}
        currentDiscount={selectedCartItem?.discount || 0}
        currentDiscountType={selectedCartItem?.discountType || 0}
        isOpen={isDiscountModalOpen}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setSelectedCartItem(null);
        }}
        onApply={handleApplyDiscount}
        t={(key: string) => t(key as any)}
      />

      {/* Main Layout - matching client 2-column layout */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Desktop Cart Panel - Left Side */}
        <aside 
          className={`hidden lg:flex lg:flex-col bg-white ${dir === 'rtl' ? 'border-s' : 'border-e'} border-gray-200 h-full overflow-hidden relative`}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Cart */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Cart Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  {t('cart')}
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 rounded-md flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {cart.length > 0 && (
                <p className="text-xs text-gray-500">
                  {cart.length} {cart.length === 1 ? t('cartProduct') : t('cartProducts')} - {cartTotalItems} {cartTotalItems === 1 ? t('piece') : t('pieces')}
                </p>
              )}
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 px-3 sm:px-4 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('cartEmpty')}</h3>
                  <p className="text-xs text-gray-500">{t('emptyCartMessage')}</p>
                </div>
              ) : (
                <div className="py-2">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      onClick={() => openQuantityModal(item.product)}
                      className="flex gap-2 py-1.5 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors rounded-md cursor-pointer"
                    >
                      {/* Image */}
                      <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                        {item.product.imageUrl ? (
                          <img
                            src={getImageUrl(item.product.imageUrl)}
                            alt={item.product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-0.5">
                          <h4 className="font-medium text-gray-900 line-clamp-1 leading-tight text-xs">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.product.id);
                            }}
                            className="h-5 w-5 -mt-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 rounded flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            {formatCurrency(item.product.price)} ×
                            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-primary text-white rounded-full text-[8px] font-bold">
                              {item.quantity}
                            </span>
                          </p>

                          <span className="font-bold text-gray-900 text-xs">
                            {(() => {
                              const itemSubtotal = item.product.price * item.quantity;
                              const itemDiscountAmount = item.discountType === 1 
                                ? (itemSubtotal * item.discount) / 100 
                                : item.discount;
                              const itemTotal = itemSubtotal - itemDiscountAmount;
                              return formatCurrency(itemTotal);
                            })()}
                          </span>
                        </div>

                        {/* Discount info and button */}
                        <div className="flex items-center justify-between mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDiscountModal(item);
                            }}
                            className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                              item.discount > 0
                                ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {item.discount > 0 
                              ? `${item.discountType === 1 ? `${item.discount}%` : formatCurrency(item.discount)}`
                              : t('discount')
                            }
                          </button>
                          
                          {item.discount > 0 && (
                            <span className="text-[9px] text-gray-400 line-through">
                              {formatCurrency(item.product.price * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary - Fixed at Bottom */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50 space-y-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{t('total')}</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>

                <button
                  onClick={handleConfirmCash}
                  disabled={!selectedCustomer || cart.length === 0 || createOrderMutation.isPending}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createOrderMutation.isPending ? t('loading') : 'Confirm / Cash'}
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={!selectedCustomer || cart.length === 0}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {'Payment'}
                </button>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          {!showCustomerModal && !isPriceModalOpen && !isModalOpen && !isDiscountModalOpen && (
            <div
              onMouseDown={startResizing}
              className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-0 bottom-0 w-2 hover:w-3 cursor-col-resize transition-all z-50 group`}
              style={{ 
                background: isResizing ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
              }}
            >
              <div 
                className={`absolute inset-y-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-px bg-gray-300 group-hover:bg-primary group-hover:w-0.5 transition-all`}
              />
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Search Bar */}
          <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <div className="relative">
                <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                <input
                  type="text"
                  placeholder={t('searchProducts')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                />
              </div>
            </div>
          </div>

          {/* Products Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {productsLoading ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-1.5 sm:p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('noProductsFound')}
                </h3>
                <p className="text-gray-500 max-w-md">
                  {searchQuery ? t('noResultsMessage') : t('noProductsInCategory')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {filteredProducts.map((product: Product, index: number) => {
                  const cartItem = cart.find(item => item.product.id === product.id);
                  const quantity = cartItem?.quantity || 0;

                  return (
                    <div
                      key={product.id}
                      style={{ animationDelay: `${index * 20}ms` }}
                      onClick={() => openQuantityModal(product)}
                      className={`group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer active:scale-[0.98] animate-fade-in ${
                        quantity > 0 ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}

                        {/* Quantity badge when in cart */}
                        {quantity > 0 && (
                          <div className={`absolute top-1 ${dir === 'rtl' ? 'left-1' : 'right-1'} min-w-[20px] h-5 px-1 bg-primary text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-md`}>
                            {quantity}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
                        <h3 className="font-medium text-gray-900 line-clamp-2 sm:line-clamp-1 leading-tight mb-1 text-[11px] sm:text-xs">
                          {product.name}
                        </h3>

                        <div className="mt-auto">
                          <span className="text-[11px] sm:text-xs font-bold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
