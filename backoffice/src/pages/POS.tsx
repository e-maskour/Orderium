import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { NotificationBell } from '../components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingBag, Trash2, User, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ProductQuantityModal } from '../components/ProductQuantityModal';

interface Product {
  Id: number;
  Name: string;
  Description?: string;
  Price: number;
  Cost?: number;
  CategoryId?: number;
  imageUrl?: string;
  IsEnabled?: boolean;
  IsService?: boolean;
  Stock?: number;
  Code?: string;
}

interface Customer {
  Id: number;
  Name: string;
  PhoneNumber: string;
  Address?: string;
  Latitude?: number;
  Longitude?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS() {
  const { admin, logout } = useAuth();
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    Name: '',
    PhoneNumber: '',
    Address: '',
  });

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
      return response.json();
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
        const response = await fetch(`/api/customers/search?phone=${encodeURIComponent(customerSearch)}`);
        if (!response.ok) throw new Error('Failed to search customers');
        const data = await response.json();
        
        if (data.customers && data.customers.length > 0) {
          setCustomerSuggestions(data.customers);
          setShowSuggestions(true);
          setShowCustomerForm(false);
        } else {
          setCustomerSuggestions([]);
          setShowSuggestions(false);
          setShowCustomerForm(true);
          setNewCustomer({ ...newCustomer, PhoneNumber: customerSearch, Name: '' });
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
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) throw new Error('Failed to create customer');
      const data = await response.json();
      return data.customer;
    },
    onSuccess: (customer) => {
      setSelectedCustomer(customer);
      setShowCustomerForm(false);
      setShowSuggestions(false);
      setCustomerSearch(customer.Name);
      toast.success(t('customerCreated') || 'Customer created successfully');
    },
    onError: () => {
      toast.error(t('failedToCreate') || 'Failed to create customer');
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
      toast.success(`${t('orderCreated') || 'Order created'}: ${data.documentNumber}`);
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: () => {
      toast.error(t('failedToCreate') || 'Failed to create order');
    },
  });

  const filteredProducts = products.filter((p: Product) =>
    p.IsEnabled !== false &&
    p.IsService !== true &&
    (searchQuery === '' || 
     p.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.Description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (quantity: number) => {
    if (!selectedProduct) return;
    
    const existing = cart.find(item => item.product.Id === selectedProduct.Id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.Id === selectedProduct.Id
          ? { ...item, quantity }
          : item
      ));
    } else {
      setCart([...cart, { product: selectedProduct, quantity }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.Id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + (item.product.Price * item.quantity), 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!selectedCustomer) {
      toast.error(t('selectCustomer') || 'Please select a customer');
      return;
    }
    
    if (cart.length === 0) {
      toast.error(t('cartEmpty') || 'Cart is empty');
      return;
    }

    const orderData = {
      CustomerId: selectedCustomer.Id,
      Items: cart.map(item => ({
        ProductId: item.product.Id,
        Quantity: item.quantity,
        Price: item.product.Price,
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.Name);
    setShowSuggestions(false);
    setShowCustomerForm(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Header - matching client Header component */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-white font-bold text-lg sm:text-xl">P</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">{t('pos') || 'Point of Sale'}</h1>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <LanguageToggle />
            <span className="text-xs sm:text-sm text-gray-700 font-medium hidden md:inline">{admin?.PhoneNumber}</span>
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Product Quantity Modal */}
      <ProductQuantityModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        initialQuantity={cart.find(item => item.product.Id === selectedProduct?.Id)?.quantity || 0}
        language={language}
        t={(key: string) => t(key as any)}
      />

      {/* Main Layout - matching client 2-column layout */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col lg:flex-[2]">
          {/* Sticky Search Bar - matching client */}
          <div className="sticky top-14 sm:top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <div className="relative">
                <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                <input
                  type="text"
                  placeholder={t('searchProducts') || 'Search products...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                />
              </div>
            </div>
          </div>

          {/* Products Grid - matching client container */}
          <div className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-24 lg:pb-8">
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
                      {t('noProductsFound') || 'No products found'}
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      {searchQuery ? 'Try adjusting your search' : 'No products available'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                    {filteredProducts.map((product: Product, index: number) => {
                      const cartItem = cart.find(item => item.product.Id === product.Id);
                      const quantity = cartItem?.quantity || 0;

                      return (
                        <div
                          key={product.Id}
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
                                alt={product.Name}
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
                              {product.Name}
                            </h3>

                            <div className="mt-auto">
                              <span className="text-[11px] sm:text-xs font-bold text-primary">
                                {formatCurrency(product.Price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            {/* Right Side Panel - Customer & Cart matching client sidebar */}
            <aside className={`hidden lg:flex lg:flex-col bg-white ${dir === 'rtl' ? 'border-s' : 'border-e'} border-gray-200 sticky top-14 sm:top-16 h-[calc(100vh-4rem)] overflow-hidden lg:flex-[1] lg:min-w-[320px] lg:max-w-[400px]`}>
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
                    placeholder={t('searchByNameOrPhone') || 'Search by name or phone...'}
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
                        key={customer.Id}
                        onClick={() => selectCustomer(customer)}
                        className="p-2.5 hover:bg-primary/10 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <p className="font-semibold text-gray-900 text-sm">{customer.Name}</p>
                        <p className="text-xs text-gray-600">{customer.PhoneNumber}</p>
                        {customer.Address && (
                          <p className="text-xs text-gray-500 line-clamp-1">{customer.Address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="font-semibold text-emerald-900 text-sm">{selectedCustomer.Name}</p>
                    <p className="text-xs text-emerald-700">{selectedCustomer.PhoneNumber}</p>
                    {selectedCustomer.Address && (
                      <p className="text-xs text-emerald-700 flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{selectedCustomer.Address}</span>
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                      className="mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      {t('change') || 'Change'}
                    </button>
                  </div>
                )}

                {showCustomerForm && !selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-blue-700 font-medium">{t('newCustomer') || 'New Customer'}</p>
                    <input
                      type="text"
                      placeholder={t('name')}
                      value={newCustomer.Name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, Name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder={t('phoneNumber')}
                      value={newCustomer.PhoneNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, PhoneNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder={t('address')}
                      value={newCustomer.Address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, Address: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => createCustomerMutation.mutate(newCustomer)}
                      disabled={!newCustomer.Name || !newCustomer.PhoneNumber || createCustomerMutation.isPending}
                      className="w-full bg-blue-600 text-white py-2 text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {createCustomerMutation.isPending ? t('loading') : t('create')}
                    </button>
                  </div>
                )}
              </div>            </div>
              {/* Cart */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Cart Header */}
                <div className="p-3 sm:p-4 border-b border-gray-200">
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
                    {cart.length} {cart.length === 1 ? 'produit' : 'produits'} - {cartTotalItems} {cartTotalItems === 1 ? 'pièce' : 'pièces'}
                  </p>
                )}
              </div>

              {/* Cart Items */}
              <div className="px-3 sm:px-4 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('cartEmpty')}</h3>
                    <p className="text-xs text-gray-500">Ajoutez des produits pour commencer</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.Id}
                        onClick={() => openQuantityModal(item.product)}
                        className="flex gap-2 py-1.5 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors rounded-md cursor-pointer"
                      >
                        {/* Image */}
                        <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.Name}
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
                              {item.product.Name}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.product.Id);
                              }}
                              className="h-5 w-5 -mt-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 rounded flex items-center justify-center"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                              {formatCurrency(item.product.Price)} ×
                              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-primary text-white rounded-full text-[8px] font-bold">
                                {item.quantity}
                              </span>
                            </p>

                            <span className="font-bold text-gray-900 text-xs">
                              {formatCurrency(item.product.Price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50 space-y-3">
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
                    {createOrderMutation.isPending ? t('loading') : (t('createOrder') || 'Create Order')}
                  </button>
                </div>
              )}
              </div>
            </aside>
          </div>
    </div>
  );
}
