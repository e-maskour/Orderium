import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { Dialog } from 'primereact/dialog';
import { CheckCircle2, MapPin, ReceiptText, FileText } from 'lucide-react';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { CartItem } from '@/context/CartContext';
import { useState } from 'react';
import { API_BASE_URL } from '@/services/httpClient';
import { API_ROUTES } from '@/common/api-routes';

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
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!state?.orderNumber || !state?.items || !state?.orderId) {
    return <Navigate to="/" replace />;
  }

  const orderId = state.orderId;

  const handlePreview = async (type: 'receipt' | 'invoice') => {
    const endpoint =
      type === 'receipt'
        ? `${API_BASE_URL}${API_ROUTES.PDF.RECEIPT(orderId)}`
        : `${API_BASE_URL}${API_ROUTES.PDF.DELIVERY_NOTE(orderId)}`;
    const title = type === 'receipt' ? t('receipt') : t('deliveryNote');
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('orderium_token');
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setPdfTitle(`${title} ${state.orderNumber}`);
      setShowPreview(true);
    } catch {
      // silently ignore
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem 4rem',
      }}
      dir={dir}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '26rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Hero */}
        <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <CheckCircle2 size={36} color="#059669" strokeWidth={2} />
          </div>
          <h1
            style={{
              margin: '0 0 0.25rem',
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            {t('orderSuccess')}
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem' }}>
            {t('thankYou')}, <strong style={{ color: '#111827' }}>{state.customerName}</strong>
          </p>
        </div>

        {/* Order card */}
        <div
          style={{
            background: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          {/* Order number */}
          <div
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>
              {t('orderNumber')}
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: '#059669',
                background: '#f0fdf4',
                padding: '0.2rem 0.6rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1fae5',
              }}
            >
              {state.orderNumber}
            </span>
          </div>

          {/* Total */}
          <div
            style={{
              padding: '1.25rem 1.25rem 1rem',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              {t('total')}
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.625rem',
                color: '#0f172a',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {formatCurrency(state.total, language)}
            </span>
          </div>

          {/* Documents row */}
          <div
            style={{
              borderTop: '1px solid #f3f4f6',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <button
              onClick={() => handlePreview('receipt')}
              disabled={pdfLoading}
              style={{
                padding: '0.875rem',
                background: 'none',
                border: 'none',
                borderRight: '1px solid #f3f4f6',
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                color: '#374151',
                fontSize: '0.8125rem',
                fontWeight: 600,
                opacity: pdfLoading ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <ReceiptText size={14} color="#059669" />
              {t('receipt')}
            </button>
            <button
              onClick={() => handlePreview('invoice')}
              disabled={pdfLoading}
              style={{
                padding: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                color: '#374151',
                fontSize: '0.8125rem',
                fontWeight: 600,
                opacity: pdfLoading ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <FileText size={14} color="#6366f1" />
              {t('deliveryNote')}
            </button>
          </div>
        </div>

        {/* Track Order — primary CTA */}
        <button
          onClick={() => setShowTracking(true)}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
        >
          <MapPin size={16} />
          {t('trackYourOrder')}
        </button>

        {/* Back to Home — text link */}
        <Link
          to="/"
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#9ca3af',
            fontWeight: 500,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#6b7280')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af')}
        >
          {t('backToHome')}
        </Link>
      </div>

      {/* PDF Preview */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={handleClosePreview}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />

      {/* Tracking Dialog */}
      <Dialog
        visible={showTracking}
        onHide={() => setShowTracking(false)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} color="#0f172a" />
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{t('trackOrder')}</span>
          </div>
        }
        modal
        className="w-full"
        style={{ maxWidth: '40rem' }}
        dir={dir}
      >
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '0.625rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>
            {t('orderNumber')}
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: '#0f172a',
            }}
          >
            {state.orderNumber}
          </span>
        </div>
        {user?.customerId && (
          <OrderTracking orderNumber={state.orderNumber} customerId={user.customerId} />
        )}
      </Dialog>
    </div>
  );
};

export default Success;
