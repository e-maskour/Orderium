import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { ordersService } from '@/modules/orders';
import { Order, OrderItem } from '@/modules/orders/orders.interface';
import { Dialog } from 'primereact/dialog';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/context/CartContext';
import { Package, MapPin, Calendar as CalendarIcon, FileText, ReceiptText, ChevronLeft, ChevronRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toastError } from '@/services/toast.service';

const STATUS_CONFIG: Record<string, { label_fr: string; label_ar: string; color: string; bg: string; stripe: string }> = {
  pending:     { label_fr: 'En attente',   label_ar: 'قيد الانتظار',  color: '#1d4ed8', bg: '#eff6ff', stripe: '#3b82f6' },
  assigned:    { label_fr: 'Assignée',      label_ar: 'مُعيَّنة',       color: '#7c3aed', bg: '#f5f3ff', stripe: '#8b5cf6' },
  confirmed:   { label_fr: 'Confirmée',     label_ar: 'مؤكدة',          color: '#0369a1', bg: '#e0f2fe', stripe: '#0ea5e9' },
  picked_up:   { label_fr: 'Récupérée',     label_ar: 'تم الاستلام',    color: '#0e7490', bg: '#cffafe', stripe: '#06b6d4' },
  to_delivery: { label_fr: 'En préparation',label_ar: 'جاهز للتسليم',  color: '#c2410c', bg: '#fff7ed', stripe: '#f97316' },
  in_delivery: { label_fr: 'En livraison',  label_ar: 'في الطريق',      color: '#a16207', bg: '#fefce8', stripe: '#eab308' },
  delivered:   { label_fr: 'Livrée',        label_ar: 'تم التسليم',     color: '#15803d', bg: '#f0fdf4', stripe: '#22c55e' },
  canceled:    { label_fr: 'Annulée',       label_ar: 'ملغاة',           color: '#b91c1c', bg: '#fef2f2', stripe: '#ef4444' },
};

export default function MyOrders() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isCartOpen, closeCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.customerId) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const response = await ordersService.getCustomerOrders(
          user.customerId, currentPage, pageSize,
          undefined,
          statusFilter !== 'all' ? statusFilter as any : undefined,
        );
        if (response.success) {
          setOrders(response.orders);
          setTotalCount(response.total);
          setTotalPages(response.totalPages);
        }
      } catch {
        toastError(t('error'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user, currentPage, pageSize, statusFilter, t]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalCount };
    orders.forEach(o => {
      const s = o.deliveryStatus || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [orders, totalCount]);

  const getStatusLabel = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return language === 'ar' ? cfg.label_ar : cfg.label_fr;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-MA', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const handleViewItems = async (order: Order) => {
    try {
      const orderDetails = await ordersService.getById(order.id);
      setSelectedOrderItems({ order, items: orderDetails.items || [] });
    } catch {
      toastError(t('error'));
    }
  };

  const handlePreview = (documentType: 'receipt' | 'invoice') => {
    if (!selectedOrderItems) return;
    const orderId = selectedOrderItems.order.id;
    if (!orderId) { toastError(t('orderIdMissing')); return; }
    const endpoint = documentType === 'receipt'
      ? `/api/pdf/receipt/${orderId}?mode=preview`
      : `/api/pdf/delivery-note/${orderId}?mode=preview`;
    setPdfUrl(endpoint);
    setPdfTitle(`${documentType === 'receipt' ? t('receipt') : t('deliveryNote')} ${selectedOrderItems.order.orderNumber}`);
    setSelectedOrderItems(null);
    setShowPDFPreview(true);
  };

  const statusTabs = [
    { key: 'all', label: language === 'ar' ? 'الكل' : 'Tous' },
    { key: 'pending',     label: language === 'ar' ? 'انتظار' : 'Attente' },
    { key: 'in_delivery', label: language === 'ar' ? 'الطريق' : 'Livraison' },
    { key: 'delivered',   label: language === 'ar' ? 'تسليم' : 'Livrée' },
    { key: 'canceled',    label: language === 'ar' ? 'ملغاة' : 'Annulée' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", paddingBottom: '5rem' }} dir={dir}>

      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)',
        padding: '1rem 1.25rem 3rem',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', textDecoration: 'none', color: 'white', flexShrink: 0, WebkitTapHighlightColor: 'transparent' as const }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: 0 }}>
                {t('orders') || 'Commandes'}
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>{t('myOrders')}</h1>
            </div>
          </div>
          {totalCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, borderRadius: '999px', padding: '0.3rem 0.75rem' }}>
              📦 {totalCount}
            </span>
          )}
        </div>

        {/* Status chips (frosted glass) */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', scrollbarWidth: 'none' as const }}>
          {statusTabs.map(tab => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
                style={{
                  flexShrink: 0, padding: '0.3rem 0.75rem',
                  borderRadius: '999px', border: 'none',
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: isActive ? '#15803d' : '#fff',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — overlaps gradient header */}
      <div style={{ padding: '0.875rem 1rem', marginTop: '-1.75rem', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid #e5e7eb', borderTopColor: '#059669', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
            <p style={{ color: '#6b7280', margin: 0 }}>{t('loading')}</p>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Package size={28} color="#d1d5db" />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>{t('noOrdersFound')}</h3>
            <p style={{ color: '#6b7280', margin: '0 0 1.5rem', fontSize: '0.875rem' }}>{t('noOrdersYet')}</p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.875rem 2rem', borderRadius: '0.875rem', border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {t('continueShopping')}
            </button>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {orders.map(order => {
              const status = order.deliveryStatus || 'pending';
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const isActive = !['delivered', 'canceled'].includes(status);
              return (
                <div
                  key={order.id}
                  style={{
                    background: 'white',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    display: 'flex',
                    WebkitTapHighlightColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {/* Status stripe (left border) */}
                  <div style={{ width: '5px', background: cfg.stripe, flexShrink: 0 }} />

                  {/* Card body */}
                  <div style={{ flex: 1, padding: '1rem' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', fontFamily: 'monospace' }}>
                          #{order.orderNumber}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                          <CalendarIcon size={12} color="#9ca3af" />
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(order.dateCreated)}</span>
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        background: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    {/* Total */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem',
                      background: '#f8fafc', borderRadius: '0.625rem',
                      marginBottom: '0.75rem',
                    }}>
                      <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>{t('totalAmount')}</span>
                      <span style={{ fontWeight: 900, fontSize: '1.375rem', color: '#059669', letterSpacing: '-0.02em' }}>
                        {formatCurrency(order.total || 0, language)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleViewItems(order)}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1.5px solid #e5e7eb',
                          background: 'white',
                          color: '#374151',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        <FileText size={14} />
                        {t('viewDetails')}
                      </button>
                      {isActive && (
                        <button
                          onClick={() => setSelectedOrder(order.orderNumber)}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                          }}
                        >
                          <MapPin size={14} />
                          {t('track')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: '2.75rem', height: '2.75rem', borderRadius: '50%',
                    border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#374151' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    width: '2.75rem', height: '2.75rem', borderRadius: '50%',
                    border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Drawer (mobile) */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} isPanelMode={false} />
      <BottomNav />

      {/* Tracking Dialog */}
      <Dialog
        visible={!!selectedOrder}
        onHide={() => setSelectedOrder(null)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#059669" />
            <span style={{ fontWeight: 700 }}>{t('trackOrder')}</span>
          </div>
        }
        modal style={{ width: '95vw', maxWidth: '42rem' }}
        contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
      >
        {selectedOrder && user?.customerId && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ background: '#f0fdf4', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1rem', border: '1px solid #a7f3d0' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>{t('orderNumber')}</p>
              <p style={{ margin: 0, fontWeight: 800, color: '#059669', fontFamily: 'monospace', fontSize: '1.0625rem' }}>{selectedOrder}</p>
            </div>
            <OrderTracking orderNumber={selectedOrder} customerId={user.customerId} />
          </div>
        )}
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        visible={!!selectedOrderItems}
        onHide={() => setSelectedOrderItems(null)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} color="#059669" />
            <span style={{ fontWeight: 700 }}>{t('orderDetails')}</span>
          </div>
        }
        modal style={{ width: '95vw', maxWidth: '48rem' }}
        contentStyle={{ padding: 0 }}
        footer={selectedOrderItems && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '0.75rem',
            }}>
              <span style={{ fontWeight: 700, color: '#374151' }}>{t('total')}</span>
              <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#059669', letterSpacing: '-0.02em' }}>
                {formatCurrency(selectedOrderItems.order.total || 0, language)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => handlePreview('receipt')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.875rem', borderRadius: '0.875rem',
                  border: '1.5px solid #e5e7eb', background: 'white',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: '#374151',
                }}
              >
                <ReceiptText size={16} /> {t('receipt')}
              </button>
              <button
                onClick={() => handlePreview('invoice')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.875rem', borderRadius: '0.875rem',
                  border: 'none', background: 'linear-gradient(135deg, #059669, #047857)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'white',
                }}
              >
                <FileText size={16} /> {t('deliveryNote')}
              </button>
            </div>
          </div>
        )}
      >
        {selectedOrderItems && (
          <div style={{ padding: '1rem' }}>
            <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('orderNumber')}</p>
                <p style={{ margin: 0, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>#{selectedOrderItems.order.orderNumber}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('date')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{formatDate(selectedOrderItems.order.dateCreated)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedOrderItems.items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem', borderRadius: '0.75rem',
                    border: '1px solid #f0f0f0', background: 'white',
                  }}
                >
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>
                      {item.productName || `${t('cartProduct')} ${item.productId}`}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                      {item.quantity} × {formatCurrency(item.unitPrice, language)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#059669' }}>
                    {formatCurrency(item.total, language)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>

      <PDFPreviewModal isOpen={showPDFPreview} onClose={() => setShowPDFPreview(false)} pdfUrl={pdfUrl} title={pdfTitle} />
    </div>
  );
}

