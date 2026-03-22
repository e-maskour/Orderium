import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { Dialog } from 'primereact/dialog';
import { CheckCircle2, Home, FileText, Receipt as ReceiptIcon, MapPin, User, Phone } from 'lucide-react';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { CartItem } from '@/context/CartContext';
import { useState } from 'react';

interface SuccessState {
  orderNumber: string;
  orderId: number;
  total: number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CartItem[];
}

const Success = () => {
  const location = useLocation();
  const { language, t, dir } = useLanguage();
  const { user } = useAuth();
  const state = location.state as SuccessState | null;
  const [showPreview, setShowPreview] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');

  if (!state?.orderNumber || !state?.items || !state?.orderId) {
    return <Navigate to="/" replace />;
  }

  const orderId = state.orderId;

  const handlePreview = async (type: 'receipt' | 'invoice') => {
    const endpoint = type === 'receipt'
      ? `/api/pdf/receipt/${orderId}?mode=preview`
      : `/api/pdf/delivery-note/${orderId}?mode=preview`;
    const title = type === 'receipt' ? t('receipt') : t('deliveryNote');
    setPdfUrl(endpoint);
    setPdfTitle(`${title} ${state.orderNumber}`);
    setShowPreview(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #ecfdf5 0%, #f0fdf4 50%, #f8fafc 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem 1rem 3rem' }} dir={dir}>
      <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Hero check + title */}
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem' }}>
          <div style={{ width: '5.5rem', height: '5.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(5,150,105,0.35)' }}>
            <CheckCircle2 size={44} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: '0 0 0.375rem', fontWeight: 900, fontSize: '1.625rem', color: '#0f172a', letterSpacing: '-0.03em' }}>{t('orderSuccess')}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem' }}>{t('thankYou')}, <strong style={{ color: '#0f172a' }}>{state.customerName}</strong>!</p>
        </div>

        {/* Order summary card */}
        <div style={{ background: 'white', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
          {/* Order number strip */}
          <div style={{ background: '#f0fdf4', borderBottom: '1px solid #d1fae5', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{t('orderNumber')}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.0625rem', color: '#059669', background: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '0.5rem' }}>{state.orderNumber}</span>
          </div>

          {/* Customer info */}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <User size={15} color="#6b7280" />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>{state.customerName}</span>
            </div>
            {state.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Phone size={15} color="#6b7280" />
                <span style={{ fontSize: '0.875rem', color: '#374151', direction: 'ltr' }}>{state.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div style={{ margin: '0 1.25rem 1.25rem', background: '#f0fdf4', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>{t('total')}</span>
            <span style={{ fontWeight: 900, fontSize: '1.75rem', color: '#059669', letterSpacing: '-0.04em', lineHeight: 1 }}>{formatCurrency(state.total, language)}</span>
          </div>
        </div>

        {/* Track Order */}
        <button
          onClick={() => setShowTracking(true)}
          style={{ width: '100%', padding: '1rem', borderRadius: '0.875rem', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}
        >
          <MapPin size={18} />
          {t('trackYourOrder')}
        </button>

        {/* Document buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            onClick={() => handlePreview('receipt')}
            style={{ padding: '1.0625rem', borderRadius: '0.875rem', border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <ReceiptIcon size={16} />
            {t('receipt')}
          </button>
          <button
            onClick={() => handlePreview('invoice')}
            style={{ padding: '1.0625rem', borderRadius: '0.875rem', border: 'none', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <FileText size={16} />
            {t('deliveryNote')}
          </button>
        </div>

        {/* Back to Home */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1rem', borderRadius: '0.875rem', border: '2px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Home size={17} />
            {t('backToHome')}
          </button>
        </Link>
      </div>

      {/* PDF Preview */}
      <PDFPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} pdfUrl={pdfUrl} title={pdfTitle} />

      {/* Tracking Dialog */}
      <Dialog visible={showTracking} onHide={() => setShowTracking(false)}
        header={<div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><MapPin size={18} color="#3b82f6" /><span style={{ fontWeight: 700 }}>{t('trackOrder')}</span></div>}
        modal className="w-full" style={{ maxWidth: '42rem' }} dir={dir}
      >
        <div style={{ background: '#eff6ff', borderRadius: '0.875rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{t('orderNumber')}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.0625rem', color: '#3b82f6' }}>{state.orderNumber}</span>
        </div>
        {user?.customerId && <OrderTracking orderNumber={state.orderNumber} customerId={user.customerId} />}
      </Dialog>
    </div>
  );
};

export default Success;
