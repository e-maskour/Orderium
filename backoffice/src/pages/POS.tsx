import { useState, useEffect, useRef } from 'react';
import orderiumLogo from '../assets/logo-backoffice.svg';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ShoppingBag, Trash2, User, Package, ArrowLeft, Tag, ShoppingCart, X, ChevronRight } from 'lucide-react';
import { toastError } from '../services/toast.service';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Skeleton } from 'primereact/skeleton';
import { ProductQuantityModal } from '../components/ProductQuantityModal';
import { PriceConfirmModal } from '../components/PriceConfirmModal';
import { CustomerSelectionModal } from '../components/CustomerSelectionModal';
import { DiscountModal } from '../components/DiscountModal';
import { posService, IPosProduct as Product, IPosCustomer as Customer, IPosCartItem as CartItem } from '../modules/pos';
import { orderPaymentsService } from '../modules';
import { formatCurrency } from '@orderium/ui';

export default function POS() {
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();

  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    // Full URL (MinIO or any absolute URL): use directly
    if (imageUrl.startsWith('http')) return imageUrl;
    // Legacy fallback: construct from MinIO public URL
    const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
    return `${minioPublicUrl}/orderium-media/${imageUrl}`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    try { return JSON.parse(localStorage.getItem('pos_customer') || 'null'); } catch { return null; }
  });
  const hasSetDefaultCustomer = useRef(selectedCustomer !== null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos_cart') || '[]'); } catch { return []; }
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const sidebarWidth = 320;
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch { /* empty */ }
  }, [cart]);

  useEffect(() => {
    try {
      if (selectedCustomer) localStorage.setItem('pos_customer', JSON.stringify(selectedCustomer));
      else localStorage.removeItem('pos_customer');
    } catch { /* empty */ }
  }, [selectedCustomer]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    if (partnersData && partnersData.length > 0) {
      // Validate cached customer still exists in the database
      if (selectedCustomer) {
        const stillExists = partnersData.find((p: Customer) => p.id === selectedCustomer.id);
        if (!stillExists) {
          setSelectedCustomer(null);
          localStorage.removeItem('pos_customer');
        }
      }

      if (!hasSetDefaultCustomer.current) {
        const comptoirClient = partnersData.find((p: Customer) => p.name === 'Client Comptoir');
        if (comptoirClient) {
          setSelectedCustomer(comptoirClient);
          hasSetDefaultCustomer.current = true;
        }
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
    if (isMobile) setIsMobileCartOpen(true);
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
    mutationFn: async (orderData: any) => {
      const order = await posService.createOrder(orderData);
      await orderPaymentsService.create({
        orderId: order.id,
        customerId: order.customerId ?? undefined,
        amount: order.total,
        paymentDate: new Date().toISOString(),
        paymentType: 'cash',
      });
      return order;
    },
    onSuccess: (data: any) => {
      const orderNumber = data?.order?.orderNumber || data?.orderNumber || data?.documentNumber;
      const orderId = data?.order?.id || data?.id;
      localStorage.removeItem('pos_cart');
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
    localStorage.removeItem('pos_cart');
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

  // ── Shared Cart Panel Content (used by desktop aside + mobile overlay) ──
  const renderCartContent = () => (
    <>
      {/* ── Cart Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '0 1rem',
        height: '4rem',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}>
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '0.5rem',
            background: 'rgba(35,90,228,0.25)', border: '1px solid rgba(35,90,228,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ShoppingCart style={{ width: '1rem', height: '1rem', color: '#93b4f8' }} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              {t('cart')}
            </h2>
            {cart.length > 0 && (
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500 }}>
                {cartTotalItems} {cartTotalItems === 1 ? t('piece') : t('pieces')}
                <span style={{ margin: '0 0.3rem', opacity: 0.4 }}>·</span>
                {cart.length} {cart.length === 1 ? t('cartProduct') : t('cartProducts')}
              </p>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="pos-cart-clear-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Items List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 0.75rem', background: '#f8fafc' }}>
        {cart.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
            <div style={{
              width: '4rem', height: '4rem', borderRadius: '1rem',
              background: '#fff', border: '1.5px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <ShoppingCart style={{ width: '1.75rem', height: '1.75rem', color: '#cbd5e1' }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: '0 0 0.25rem' }}>{t('cartEmpty')}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{t('emptyCartMessage')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cart.map((item, index) => {
              const itemSubtotal = item.product.price * item.quantity;
              const itemDiscountAmount = item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
              const itemTotal = itemSubtotal - itemDiscountAmount;
              const hasDiscount = item.discount > 0;

              return (
                <div
                  key={item.product.id}
                  className="pos-cart-item"
                  style={{
                    background: '#fff',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Row: index + thumb + name + delete */}
                  <div
                    onClick={() => openQuantityModal(item.product)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.625rem 0.5rem', cursor: 'pointer' }}
                  >
                    {/* Index badge */}
                    <span style={{
                      width: '1.375rem', height: '1.375rem', borderRadius: '0.375rem', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                      color: 'rgba(255,255,255,0.6)', fontSize: '0.5625rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {index + 1}
                    </span>

                    {/* Thumbnail */}
                    <div style={{
                      width: '2.75rem', height: '2.75rem', borderRadius: '0.5rem', flexShrink: 0,
                      background: '#f8fafc', border: '1px solid #f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {item.product.imageUrl ? (
                        <img src={getImageUrl(item.product.imageUrl)} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Package style={{ width: '1.125rem', height: '1.125rem', color: '#cbd5e1' }} />
                      )}
                    </div>

                    {/* Name */}
                    <p style={{
                      flex: 1, minWidth: 0,
                      fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                    }}>
                      {item.product.name}
                    </p>

                    {/* Remise */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDiscountModal(item); }}
                      className="pos-disc-btn"
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.2rem 0.5rem', borderRadius: '0.375rem',
                        background: hasDiscount ? 'rgba(35,90,228,0.08)' : '#f1f5f9',
                        border: hasDiscount ? '1px solid rgba(35,90,228,0.2)' : '1px solid #e2e8f0',
                        color: hasDiscount ? '#235ae4' : '#94a3b8',
                        fontSize: '0.625rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <Tag style={{ width: '0.5625rem', height: '0.5625rem' }} />
                      {hasDiscount
                        ? (item.discountType === 1 ? `−${item.discount}%` : `−${formatCurrency(item.discount, language as 'fr' | 'ar')}`)
                        : (t('discount'))}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                      className="pos-cart-del-btn"
                      style={{
                        flexShrink: 0, width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem',
                        background: '#fef2f2', border: '1px solid #fee2e2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X style={{ width: '0.625rem', height: '0.625rem', color: '#f87171' }} />
                    </button>
                  </div>

                  {/* Row: qty × price → total */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.375rem 0.625rem',
                    background: '#f8fafc', borderTop: '1px solid #f1f5f9',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }} onClick={() => openQuantityModal(item.product)}>
                      <span style={{
                        minWidth: '1.75rem', height: '1.5rem', padding: '0 0.375rem', borderRadius: '0.375rem',
                        background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                        color: '#fff', fontSize: '0.6875rem', fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(35,90,228,0.3)',
                      }}>
                        {item.quantity}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>× {formatCurrency(item.product.price, language as 'fr' | 'ar')}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {formatCurrency(itemTotal, language as 'fr' | 'ar')}
                      </span>
                      {hasDiscount && (
                        <span style={{ display: 'block', fontSize: '0.625rem', color: '#94a3b8', textDecoration: 'line-through', lineHeight: 1 }}>
                          {formatCurrency(itemSubtotal, language as 'fr' | 'ar')}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer: Summary + Actions ── */}
      {cart.length > 0 && (
        <div style={{
          background: '#fff',
          borderTop: '1.5px solid #e2e8f0',
          padding: '0.875rem 1rem 1rem',
          display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0,
        }}>
          {/* Summary panel */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '0.875rem',
            padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('total')}
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {formatCurrency(total, language as 'fr' | 'ar')}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                {cart.length} {cart.length === 1 ? t('cartProduct') : t('cartProducts')}
              </p>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                {cartTotalItems} {cartTotalItems === 1 ? t('piece') : t('pieces')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              label={t('confirmCash') || 'Cash'}
              icon={<ShoppingBag style={{ width: '0.875rem', height: '0.875rem' }} strokeWidth={2.5} />}
              onClick={handleConfirmCash}
              disabled={!selectedCustomer || cart.length === 0 || createOrderMutation.isPending}
              loading={createOrderMutation.isPending}
              style={{
                flex: 1, height: '2.75rem',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none', borderRadius: '0.75rem',
                fontSize: '0.8125rem', fontWeight: 700, color: '#fff',
                boxShadow: (!selectedCustomer || cart.length === 0) ? 'none' : '0 4px 12px rgba(34,197,94,0.30)',
              }}
            />
            <Button
              label={t('payment') || 'Pay'}
              icon={<ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} strokeWidth={2.5} />}
              onClick={handleCheckout}
              disabled={!selectedCustomer || cart.length === 0}
              style={{
                flex: 1, height: '2.75rem',
                background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                border: 'none', borderRadius: '0.75rem',
                fontSize: '0.8125rem', fontWeight: 700, color: '#fff',
                boxShadow: (!selectedCustomer || cart.length === 0) ? 'none' : '0 4px 12px rgba(35,90,228,0.30)',
              }}
            />
          </div>

          {!selectedCustomer && (
            <button
              onClick={() => setShowCustomerModal(true)}
              style={{
                width: '100%', padding: '0.5rem', borderRadius: '0.625rem',
                background: 'rgba(35,90,228,0.08)', border: '1px dashed rgba(35,90,228,0.4)',
                color: '#235ae4', fontSize: '0.6875rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}
            >
              <User style={{ width: '0.75rem', height: '0.75rem' }} />
              {t('selectCustomer')}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }} dir={dir}>
      {/* ─── POS Global Styles ─── */}
      <style>{`
        .pos-product-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .pos-product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(35,90,228,0.14) !important; }
        .pos-cart-item { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .pos-cart-item:hover { border-color: #bfdbfe !important; box-shadow: 0 2px 10px rgba(35,90,228,0.10) !important; }
        .pos-cart-clear-btn { transition: background 0.12s, border-color 0.12s; }
        .pos-cart-clear-btn:hover { background: rgba(239,68,68,0.22) !important; }
        .pos-cart-del-btn { transition: background 0.12s; }
        .pos-cart-del-btn:hover { background: #fee2e2 !important; }
        .pos-disc-btn { transition: background 0.12s; }
        .pos-disc-btn:hover { background: rgba(35,90,228,0.14) !important; }
        .pos-keypad-btn { transition: transform 0.1s ease, background 0.1s ease; }
        .pos-keypad-btn:active { transform: scale(0.95); }
        .pos-search-input:focus { border-color: #235ae4 !important; box-shadow: 0 0 0 3px rgba(35,90,228,0.14) !important; }
        .pos-mobile-overlay { animation: slideUp 0.28s cubic-bezier(0.34,1.36,0.64,1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (max-width: 767px) {
          .pos-desktop-cart { display: none !important; }
          .pos-desktop-resize { display: none !important; }
        }
        @media (min-width: 768px) {
          .pos-mobile-fab { display: none !important; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header style={{
        background: 'linear-gradient(135deg, #1e1e2d 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        paddingTop: 'env(safe-area-inset-top, 0)',
      }}>
        <div style={{ padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.75rem' }}>
            {/* Left: back + branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <button
                onClick={() => navigate('/dashboard')}
                title={t('back')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.375rem', fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.85)', borderRadius: '0.5rem',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft style={{ width: '0.875rem', height: '0.875rem', transform: dir === 'rtl' ? 'rotate(180deg)' : undefined }} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <img
                  src={orderiumLogo}
                  alt="Morocom"
                  style={{ width: '2.25rem', height: '2.25rem' }}
                />
                <div>
                  <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                    {t('pointOfSale')}
                  </h1>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.45)', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Morocom POS
                  </p>
                </div>
              </div>
            </div>

            {/* Right: customer selector */}
            <Button
              onClick={() => setShowCustomerModal(true)}
              icon={<User style={{ width: selectedCustomer ? '0.75rem' : '0.875rem', height: selectedCustomer ? '0.75rem' : '0.875rem', color: selectedCustomer ? '#fff' : 'rgba(255,255,255,0.5)' }} />}
              label={selectedCustomer ? selectedCustomer.name : t('selectCustomer')}
              style={selectedCustomer ? {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '2rem', color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
              } : {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '2rem', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.8125rem', fontWeight: 500,
              }}
            />
          </div>
        </div>
      </header>

      {/* ═══ MODALS ═══ */}
      <CustomerSelectionModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSelectCustomer={handleSelectCustomer} selectedCustomer={selectedCustomer} t={(key: string) => t(key as any)} dir={dir} />
      <PriceConfirmModal product={selectedProduct} isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} onConfirm={handlePriceConfirm} language={language} t={(key: string) => t(key as any)} />
      <ProductQuantityModal product={selectedProduct} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddToCart={handleAddToCart} initialQuantity={cart.find(item => item.product.id === selectedProduct?.id)?.quantity || 0} language={language} t={(key: string) => t(key as any)} />
      <DiscountModal productName={selectedCartItem?.product.name || ''} quantity={selectedCartItem?.quantity || 0} unitPrice={selectedCartItem?.product.price || 0} currentDiscount={selectedCartItem?.discount || 0} currentDiscountType={selectedCartItem?.discountType || 0} isOpen={isDiscountModalOpen} onClose={() => { setIsDiscountModalOpen(false); setSelectedCartItem(null); }} onApply={handleApplyDiscount} t={(key: string) => t(key as any)} />

      {/* ═══ MAIN LAYOUT ═══ */}
      <div style={{ display: 'flex', height: 'calc(100vh - 3.75rem)', overflow: 'hidden' }}>

        {/* ── DESKTOP CART PANEL ── */}
        <aside
          className="pos-desktop-cart"
          style={{
            display: 'flex', flexDirection: 'column',
            backgroundColor: '#fff',
            height: '100%', overflow: 'hidden', position: 'relative',
            width: `${sidebarWidth}px`,
            flexShrink: 0,
            borderRight: dir === 'rtl' ? undefined : '1px solid #e5e7eb',
            borderLeft: dir === 'rtl' ? '1px solid #e5e7eb' : undefined,
          }}
        >
          {renderCartContent()}
        </aside>

        {/* ── MAIN CONTENT (Products) ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>
          {/* Search Bar */}
          <div style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 1rem',
            height: '4rem',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search style={{
                width: '1rem', height: '1rem',
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', pointerEvents: 'none', zIndex: 1,
              }} />
              <InputText
                type="text"
                placeholder={t('searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pos-search-input"
                style={{
                  width: '100%', paddingLeft: '2.375rem', paddingRight: searchQuery ? '2.375rem' : undefined,
                  height: '2.5rem', borderRadius: '0.625rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.18s, box-shadow 0.18s',
                }}
              />
              {searchQuery && (
                <Button
                  icon={<X style={{ width: '0.625rem', height: '0.625rem', color: '#6b7280' }} />}
                  onClick={() => setSearchQuery('')}
                  rounded text
                  style={{
                    position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                    background: '#e5e7eb',
                    width: '1.25rem', height: '1.25rem', padding: 0,
                  }}
                />
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {productsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ backgroundColor: '#fff', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <Skeleton height="7rem" borderRadius="0" />
                    <div style={{ padding: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <Skeleton width="75%" height="0.75rem" />
                      <Skeleton width="50%" height="0.75rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', textAlign: 'center' }}>
                <div style={{
                  width: '5rem', height: '5rem', borderRadius: '1.25rem',
                  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                }}>
                  <Package style={{ width: '2.25rem', height: '2.25rem', color: '#9ca3af' }} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>{t('noProductsFound')}</h3>
                <p style={{ color: '#6b7280', maxWidth: '24rem', margin: 0, fontSize: '0.875rem' }}>
                  {searchQuery ? t('noResultsMessage') : t('noProductsInCategory')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {filteredProducts.map((product: Product) => {
                  const cartItem = cart.find(item => item.product.id === product.id);
                  const quantity = cartItem?.quantity || 0;
                  const inCart = quantity > 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => openQuantityModal(product)}
                      className="pos-product-card"
                      style={{
                        position: 'relative',
                        backgroundColor: '#fff',
                        borderRadius: '0.875rem',
                        overflow: 'hidden',
                        border: inCart ? '2px solid #235ae4' : '1px solid #e5e7eb',
                        boxShadow: inCart ? '0 0 0 3px rgba(35,90,228,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex', flexDirection: 'column',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Image */}
                      <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                        {product.imageUrl ? (
                          <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                            <Package style={{ width: '2rem', height: '2rem', color: '#cbd5e1' }} />
                          </div>
                        )}
                        {inCart && (
                          <div style={{
                            position: 'absolute', top: '0.375rem',
                            [dir === 'rtl' ? 'left' : 'right']: '0.375rem',
                            minWidth: '1.375rem', height: '1.375rem', padding: '0 0.3rem',
                            background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                            color: '#fff', borderRadius: '2rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.6875rem',
                            boxShadow: '0 2px 8px rgba(35,90,228,0.40)',
                          }}>
                            {quantity}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '0.5rem 0.625rem 0.625rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <p style={{
                          fontWeight: 600, color: '#111827',
                          fontSize: '0.8125rem', lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          margin: 0,
                        }}>
                          {product.name}
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e1e2d', margin: 0 }}>
                          {formatCurrency(product.price, language as 'fr' | 'ar')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ MOBILE: Floating Cart Button ═══ */}
      {cart.length > 0 && (
        <Button
          className="pos-mobile-fab"
          onClick={() => setIsMobileCartOpen(true)}
          icon={<ShoppingCart style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} strokeWidth={2.2} />}
          badge={String(cartTotalItems)}
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            [dir === 'rtl' ? 'left' : 'right']: '1.25rem',
            zIndex: 60,
            width: '3.5rem', height: '3.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
            border: 'none',
            boxShadow: '0 6px 20px rgba(35,90,228,0.45)',
          }}
        />
      )}

      {/* ═══ MOBILE: Cart Overlay ═══ */}
      {isMobile && isMobileCartOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div
            className="pos-mobile-overlay"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '88vh',
              background: '#fff',
              borderRadius: '1.25rem 1.25rem 0 0',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ padding: '0.75rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '2.5rem', height: '0.25rem', borderRadius: '2px', background: '#d1d5db' }} />
            </div>
            {renderCartContent()}
          </div>
        </div>
      )}
    </div>
  );
}
