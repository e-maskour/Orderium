import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingBag, Trash2, User, MapPin, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProductQuantityModal } from '../components/ProductQuantityModal';
import { PriceConfirmModal } from '../components/PriceConfirmModal';
import { OrderSuccessModal } from '../components/OrderSuccessModal';

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
}

export default function POS() {
  const { t, language, dir } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phoneNumber: '',
    address: '',
  });
  const [orderSuccessData, setOrderSuccessData] = useState<{
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    items: CartItem[];
    total: number;
    orderDate: Date;
  } | null>(null);

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

  // Search customers with debounce
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      setShowCustomerForm(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // Search by name, phone, or email using the general search endpoint
        const response = await fetch(`/api/partners?search=${encodeURIComponent(customerSearch)}&type=customer&limit=10`);
        if (!response.ok) throw new Error('Failed to search customers');
        const data = await response.json();
        
        if (data.partners && data.partners.length > 0) {
          setCustomerSuggestions(data.partners);
          setShowSuggestions(true);
          setShowCustomerForm(false);
        } else {
          setCustomerSuggestions([]);
          setShowSuggestions(false);
          setShowCustomerForm(true);
          setNewCustomer({ ...newCustomer, phoneNumber: customerSearch, name: '' });
        }
      } catch (error) {
        console.error('Failed to search customers:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: typeof newCustomer) => {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) throw new Error('Failed to create customer');
      const data = await response.json();
      return data.partner;
    },
    onSuccess: (customer) => {
      setSelectedCustomer(customer);
      setShowCustomerForm(false);
      setShowSuggestions(false);
      setCustomerSearch(customer.name);
      toast.success(t('customerCreated'));
    },
    onError: () => {
      toast.error(t('failedToCreate'));
    },
  });

  // Create order mutation
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
      // Show success modal with order details
      if (selectedCustomer) {
        setOrderSuccessData({
          orderNumber: data.documentNumber,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phoneNumber,
          customerAddress: selectedCustomer.address,
          items: cart,
          total: total,
          orderDate: new Date(),
        });
      }
      
      toast.success(`${t('orderCreated')}: ${data.documentNumber}`);
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: () => {
      toast.error(t('failedToCreate'));
    },
  });

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
      setCart([...cart, { product: productWithPrice, quantity }]);
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

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!selectedCustomer) {
      toast.error(t('selectCustomer'));
      return;
    }
    
    if (cart.length === 0) {
      toast.error(t('cartEmpty'));
      return;
    }

    const orderData = {
      customerId: selectedCustomer.id,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowSuggestions(false);
    setShowCustomerForm(false);
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
          </div>
        </div>
      </header>

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

      {/* Order Success Modal */}
      {orderSuccessData && (
        <OrderSuccessModal
          isOpen={!!orderSuccessData}
          onClose={() => setOrderSuccessData(null)}
          orderNumber={orderSuccessData.orderNumber}
          customerName={orderSuccessData.customerName}
          customerPhone={orderSuccessData.customerPhone}
          customerAddress={orderSuccessData.customerAddress}
          items={orderSuccessData.items}
          total={orderSuccessData.total}
          orderDate={orderSuccessData.orderDate}
        />
      )}

      {/* Main Layout - matching client 2-column layout */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Desktop Cart Panel - Left Side */}
        <aside 
          className={`hidden lg:flex lg:flex-col bg-white ${dir === 'rtl' ? 'border-s' : 'border-e'} border-gray-200 h-full overflow-hidden relative`}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Customer Selection */}
          <div className="border-b border-gray-200 p-3 sm:p-4">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('customer')}
            </h2>

            <div className="space-y-3 relative">
              <div className="relative">
                <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                <input
                  type="text"
                  placeholder={t('searchByNameOrPhone')}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                  className={`w-full ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                />
              </div>

              {/* Customer Suggestions Dropdown */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {customerSuggestions.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="p-2.5 hover:bg-primary/10 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-600">{customer.phoneNumber}</p>
                      {customer.address && (
                        <p className="text-xs text-gray-500 line-clamp-1">{customer.address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="font-semibold text-emerald-900 text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-emerald-700">{selectedCustomer.phoneNumber}</p>
                  {selectedCustomer.address && (
                    <p className="text-xs text-emerald-700 flex items-start gap-1 mt-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{selectedCustomer.address}</span>
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    {t('change')}
                  </button>
                </div>
              )}

              {showCustomerForm && !selectedCustomer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-blue-700 font-medium">{t('newCustomer')}</p>
                  <input
                    type="text"
                    placeholder={t('name')}
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder={t('phoneNumber')}
                    value={newCustomer.phoneNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder={t('address')}
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => createCustomerMutation.mutate(newCustomer)}
                    disabled={!newCustomer.name || !newCustomer.phoneNumber || createCustomerMutation.isPending}
                    className="w-full bg-blue-600 text-white py-2 text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {createCustomerMutation.isPending ? t('loading') : t('create')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
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
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
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
                            {formatCurrency(item.product.price * item.quantity)}
                          </span>
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
                  onClick={handleCheckout}
                  disabled={!selectedCustomer || cart.length === 0 || createOrderMutation.isPending}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createOrderMutation.isPending ? t('loading') : t('createOrder')}
                </button>
              </div>
            )}
          </div>

          {/* Resize Handle */}
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
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
