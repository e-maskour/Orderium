import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ShoppingBag, Trash2, User, MapPin, Package, ArrowLeft, Tag } from 'lucide-react';
import { toastError } from '../services/toast.service';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProductQuantityModal } from '../components/ProductQuantityModal';
import { PriceConfirmModal } from '../components/PriceConfirmModal';
import { CustomerSelectionModal } from '../components/CustomerSelectionModal';
import { DiscountModal } from '../components/DiscountModal';
import { posService, IPosProduct as Product, IPosCustomer as Customer, IPosCartItem as CartItem } from '../modules/pos';

export default function POS() {
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('orderium/')) {
      return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imageUrl}`;
    }
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
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const formatCurrency = (price: number) => {
    return language === 'ar'
      ? `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.م`
      : `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
  };

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => posService.getProducts(),
  });

  const products: Product[] = productsData || [];

  const { data: partnersData } = useQuery({
    queryKey: ['partners-all'],
    queryFn: () => posService.getCustomers(),
  });

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
    if (product.isPriceChangeAllowed) {
      setIsPriceModalOpen(true);
    } else {
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
    setConfirmedPrice(null);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => { setCart([]); };

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
    mutationFn: (orderData: any) => posService.createOrder(orderData),
    onSuccess: (data: any) => {
      const orderNumber = data?.order?.orderNumber || data?.orderNumber || data?.documentNumber;
      const orderId = data?.order?.id || data?.id;
      navigate('/checkout/success', {
        state: {
          orderNumber, orderId,
          customer: { id: selectedCustomer?.id || 0, name: selectedCustomer?.name || '', phone: selectedCustomer?.phoneNumber || '', address: selectedCustomer?.address },
          items: cart, total, paidAmount: total, change: 0, orderDate: new Date(),
        }
      });
    },
    onError: (error: any) => { toastError(error.message || t('error')); },
  });

  const handleCheckout = () => {
    if (!selectedCustomer) { toastError(t('selectCustomer')); return; }
    if (cart.length === 0) { toastError(t('cartEmpty')); return; }
    navigate('/checkout', {
      state: {
        cart,
        customer: { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phoneNumber, address: selectedCustomer.address }
      }
    });
  };

  const handleConfirmCash = () => {
    if (!selectedCustomer) { toastError(t('selectCustomer')); return; }
    if (cart.length === 0) { toastError(t('cartEmpty')); return; }
    const items = cart.map(item => {
      const quantity = item.quantity;
      const unitPrice = item.product.price;
      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount = item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
      const tax = 0;
      const itemTotal = itemSubtotal - itemDiscountAmount;
      return { productId: item.product.id, description: item.product.name || '', quantity, unitPrice, discount: itemDiscountAmount, discountType: item.discountType, tax, total: itemTotal };
    });
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const orderData = {
      customerId: selectedCustomer.id, fromPortal: true, fromClient: false, deliveryStatus: 'pending',
      date: new Date().toISOString(), subtotal, tax: 0, discount: 0, discountType: 0, total: subtotal, notes: '', items
    };
    createOrderMutation.mutate(orderData);
  };

  const handleSelectCustomer = (customer: Customer) => { setSelectedCustomer(customer); };

  const startResizing = (e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); };
  const stopResizing = () => { setIsResizing(false); };
  const resize = (e: MouseEvent) => {
    if (!isResizing) return;
    e.preventDefault();
    const newWidth = dir === 'rtl' ? window.innerWidth - e.clientX : e.clientX;
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }} dir={dir}>
      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '100%', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft style={{ width: '1rem', height: '1rem', transform: dir === 'rtl' ? 'rotate(180deg)' : undefined }} />
                <span>{t('back')}</span>
              </button>
              <div style={{ height: '2rem', width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ShoppingBag style={{ width: '1.5rem', height: '1.5rem' }} />
                {t('pointOfSale')}
              </h1>
            </div>

            <button
              onClick={() => setShowCustomerModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              {selectedCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                      <div>
                        <p style={{ fontWeight: 600, color: '#064e3b', fontSize: '0.875rem', margin: 0 }}>{selectedCustomer.name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0 }}>{selectedCustomer.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                  <User style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>{t('selectCustomer')}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <CustomerSelectionModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSelectCustomer={handleSelectCustomer} selectedCustomer={selectedCustomer} t={(key: string) => t(key as any)} dir={dir} />
      <PriceConfirmModal product={selectedProduct} isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} onConfirm={handlePriceConfirm} language={language} t={(key: string) => t(key as any)} />
      <ProductQuantityModal product={selectedProduct} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddToCart={handleAddToCart} initialQuantity={cart.find(item => item.product.id === selectedProduct?.id)?.quantity || 0} language={language} t={(key: string) => t(key as any)} />
      <DiscountModal productName={selectedCartItem?.product.name || ''} quantity={selectedCartItem?.quantity || 0} unitPrice={selectedCartItem?.product.price || 0} currentDiscount={selectedCartItem?.discount || 0} currentDiscountType={selectedCartItem?.discountType || 0} isOpen={isDiscountModalOpen} onClose={() => { setIsDiscountModalOpen(false); setSelectedCartItem(null); }} onApply={handleApplyDiscount} t={(key: string) => t(key as any)} />

      {/* Main Layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* Desktop Cart Panel */}
        <aside
          style={{
            display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff',
            borderRight: dir === 'rtl' ? undefined : '1px solid #e5e7eb',
            borderLeft: dir === 'rtl' ? '1px solid #e5e7eb' : undefined,
            height: '100%', overflow: 'hidden', position: 'relative', width: `${sidebarWidth}px`,
          }}
        >
          {/* Cart Header */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ShoppingBag style={{ width: '1rem', height: '1rem' }} />
                {t('cart')}
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart} style={{ color: '#ef4444', height: '1.75rem', width: '1.75rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}>
                  <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                </button>
              )}
            </div>
            {cart.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                {cart.length} {cart.length === 1 ? t('cartProduct') : t('cartProducts')} - {cartTotalItems} {cartTotalItems === 1 ? t('piece') : t('pieces')}
              </p>
            )}
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', textAlign: 'center' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <ShoppingBag style={{ width: '2rem', height: '2rem', color: '#d1d5db' }} />
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>{t('cartEmpty')}</h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{t('emptyCartMessage')}</p>
              </div>
            ) : (
              <div style={{ padding: '0.5rem 0' }}>
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    onClick={() => openQuantityModal(item.product)}
                    style={{ display: 'flex', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                  >
                    {/* Image */}
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.375rem', backgroundColor: '#f3f4f6', overflow: 'hidden', flexShrink: 0 }}>
                      {item.product.imageUrl ? (
                        <img src={getImageUrl(item.product.imageUrl)} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package style={{ width: '1rem', height: '1rem', color: '#d1d5db' }} />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                        <h4 style={{ fontWeight: 500, color: '#111827', fontSize: '0.75rem', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          {item.product.name}
                        </h4>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                          style={{ height: '1.25rem', width: '1.25rem', color: '#9ca3af', flexShrink: 0, borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 style={{ height: '0.75rem', width: '0.75rem' }} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: '0.625rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                          {formatCurrency(item.product.price)} ×
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '16px', height: '16px', padding: '0 0.25rem', backgroundColor: 'var(--primary-color, #3b82f6)', color: '#ffffff', borderRadius: '9999px', fontSize: '0.5rem', fontWeight: 700 }}>
                            {item.quantity}
                          </span>
                        </p>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.75rem' }}>
                          {(() => {
                            const itemSubtotal = item.product.price * item.quantity;
                            const itemDiscountAmount = item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
                            return formatCurrency(itemSubtotal - itemDiscountAmount);
                          })()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDiscountModal(item); }}
                          style={{
                            fontSize: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
                            backgroundColor: item.discount > 0 ? '#ffedd5' : '#f3f4f6',
                            color: item.discount > 0 ? '#ea580c' : '#6b7280',
                          }}
                        >
                          <Tag style={{ height: '0.625rem', width: '0.625rem' }} />
                          {item.discount > 0
                            ? `${item.discountType === 1 ? `${item.discount}%` : formatCurrency(item.discount)}`
                            : t('discount')
                          }
                        </button>
                        {item.discount > 0 && (
                          <span style={{ fontSize: '0.5625rem', color: '#9ca3af', textDecoration: 'line-through' }}>
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

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{t('total')}</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>{formatCurrency(total)}</span>
              </div>
              <Button
                label="Confirm / Cash"
                onClick={handleConfirmCash}
                disabled={!selectedCustomer || cart.length === 0 || createOrderMutation.isPending}
                loading={createOrderMutation.isPending}
                severity="success"
                style={{ width: '100%', height: '2.75rem' }}
              />
              <Button
                label="Payment"
                onClick={handleCheckout}
                disabled={!selectedCustomer || cart.length === 0}
                style={{ width: '100%', height: '2.75rem' }}
              />
            </div>
          )}

          {/* Resize Handle */}
          {!showCustomerModal && !isPriceModalOpen && !isModalOpen && !isDiscountModalOpen && (
            <div
              onMouseDown={startResizing}
              style={{
                position: 'absolute', [dir === 'rtl' ? 'left' : 'right']: 0, top: 0, bottom: 0, width: '0.5rem', cursor: 'col-resize', zIndex: 50,
                background: isResizing ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
              }}
            >
              <div style={{ position: 'absolute', inset: '0', [dir === 'rtl' ? 'left' : 'right']: 0, width: '1px', backgroundColor: '#d1d5db' }} />
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Search Bar */}
          <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0.75rem 1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ width: '1rem', height: '1rem', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
                <InputText
                  type="text"
                  placeholder={t('searchProducts')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem' }}>
              {productsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="animate-pulse" style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ aspectRatio: '4/3', backgroundColor: '#e5e7eb' }} />
                      <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ height: '0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '75%' }} />
                        <div style={{ height: '0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', textAlign: 'center' }}>
                  <div style={{ width: '6rem', height: '6rem', borderRadius: '9999px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <Package style={{ width: '3rem', height: '3rem', color: '#d1d5db' }} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('noProductsFound')}</h3>
                  <p style={{ color: '#6b7280', maxWidth: '28rem', margin: 0 }}>
                    {searchQuery ? t('noResultsMessage') : t('noProductsInCategory')}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {filteredProducts.map((product: Product) => {
                    const cartItem = cart.find(item => item.product.id === product.id);
                    const quantity = cartItem?.quantity || 0;

                    return (
                      <div
                        key={product.id}
                        onClick={() => openQuantityModal(product)}
                        style={{
                          position: 'relative', backgroundColor: '#ffffff', borderRadius: '0.5rem', overflow: 'hidden',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer',
                          outline: quantity > 0 ? '2px solid var(--primary-color, #3b82f6)' : undefined,
                        }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                          {product.imageUrl ? (
                            <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)' }}>
                              <Package style={{ width: '2rem', height: '2rem', color: '#d1d5db' }} />
                            </div>
                          )}
                          {quantity > 0 && (
                            <div style={{
                              position: 'absolute', top: '0.25rem', [dir === 'rtl' ? 'left' : 'right']: '0.25rem',
                              minWidth: '20px', height: '20px', padding: '0 0.25rem',
                              backgroundColor: 'var(--primary-color, #3b82f6)', color: '#ffffff', borderRadius: '9999px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.625rem',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            }}>
                              {quantity}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, padding: '0.375rem 0.5rem', display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.2', marginBottom: '0.25rem', fontSize: '0.75rem', margin: 0 }}>
                            {product.name}
                          </h3>
                          <div style={{ marginTop: 'auto' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
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
