import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { CheckCircle2, Home, FileText, Receipt as ReceiptIcon, MapPin, Package, User, Phone } from 'lucide-react';
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

  const trackingHeader = (
    <div className="flex align-items-center gap-2">
      <div className="flex align-items-center justify-content-center border-circle" style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        <MapPin style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
      </div>
      <span className="font-bold text-xl">{t('trackOrder')}</span>
    </div>
  );

  return (
    <div className="flex align-items-center justify-content-center p-3" dir={dir} style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa, #ecfeff)' }}>
      <div className="w-full" style={{ maxWidth: '56rem' }}>
        {/* Success icon */}
        <div className="text-center mb-3" style={{ position: 'relative' }}>
          <div className="flex align-items-center justify-content-center mx-auto border-circle shadow-4" style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg, #34d399, #14b8a6, #06b6d4)' }}>
            <CheckCircle2 style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} />
          </div>
        </div>

        {/* Main Card */}
        <div className="surface-card border-round-2xl shadow-4 overflow-hidden">
          {/* Header */}
          <div className="text-center p-3" style={{ background: 'linear-gradient(to right, #10b981, #14b8a6, #06b6d4)' }}>
            <h1 className="text-xl font-bold text-white mb-1">{t('orderSuccess')}</h1>
            <p className="text-sm font-medium" style={{ color: '#ecfdf5' }}>{t('thankYou')}, {state.customerName}! 🎉</p>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-column gap-3">
            {/* Order Summary */}
            <div className="surface-100 border-round-xl p-3 border-2" style={{ borderColor: '#a7f3d0' }}>
              <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
                <div className="flex align-items-center gap-2">
                  <ReceiptIcon style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                  <span className="text-xs font-semibold text-color-secondary">{t('orderNumber')}</span>
                </div>
                <span className="font-bold text-sm" style={{ fontFamily: 'monospace', color: '#059669', background: '#d1fae5', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>{state.orderNumber}</span>
              </div>

              <div className="grid">
                <div className="col-6">
                  <div className="surface-card p-2 border-round-lg flex align-items-center gap-2">
                    <User style={{ width: '1rem', height: '1rem', color: '#0d9488' }} />
                    <div>
                      <p className="text-color-secondary" style={{ fontSize: '0.625rem' }}>{t('customer')}</p>
                      <p className="text-xs font-semibold text-color overflow-hidden white-space-nowrap" style={{ textOverflow: 'ellipsis' }}>{state.customerName}</p>
                    </div>
                  </div>
                </div>
                {state.customerPhone && (
                  <div className="col-6">
                    <div className="surface-card p-2 border-round-lg flex align-items-center gap-2">
                      <Phone style={{ width: '1rem', height: '1rem', color: '#0891b2' }} />
                      <div>
                        <p className="text-color-secondary" style={{ fontSize: '0.625rem' }}>{t('phone') || 'Phone'}</p>
                        <p className="text-xs font-semibold text-color">{state.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Divider />
              <div className="flex align-items-center justify-content-between">
                <span className="text-sm font-bold text-color-secondary">{t('total')}</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(state.total, language)}</span>
              </div>
            </div>

            {/* Track Order */}
            <Button
              label={t('trackYourOrder')}
              icon="pi pi-map-marker"
              onClick={() => setShowTracking(true)}
              className="w-full"
              style={{ background: 'linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)', border: 'none' }}
            />

            {/* Document buttons */}
            <div className="grid">
              <div className="col-6">
                <Button
                  onClick={() => handlePreview('receipt')}
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', border: 'none' }}
                >
                  <div className="flex flex-column align-items-center gap-1 w-full py-1">
                    <ReceiptIcon style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                    <span className="text-xs font-bold text-white">{t('receipt')}</span>
                  </div>
                </Button>
              </div>
              <div className="col-6">
                <Button
                  onClick={() => handlePreview('invoice')}
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', border: 'none' }}
                >
                  <div className="flex flex-column align-items-center gap-1 w-full py-1">
                    <FileText style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                    <span className="text-xs font-bold text-white">{t('deliveryNote')}</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Back to Home */}
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button
                label={t('backToHome')}
                icon={<Home style={{ width: '0.875rem', height: '0.875rem', marginInlineEnd: '0.5rem' }} />}
                outlined
                severity="secondary"
                className="w-full"
              />
            </Link>
          </div>
        </div>

        {/* PDF Preview */}
        <PDFPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} pdfUrl={pdfUrl} title={pdfTitle} />

        {/* Tracking Dialog */}
        <Dialog visible={showTracking} onHide={() => setShowTracking(false)} header={trackingHeader} modal className="w-full" style={{ maxWidth: '42rem' }} dir={dir}>
          <div className="surface-100 border-round-xl p-3 mb-4 border-2" style={{ borderColor: '#bfdbfe' }}>
            <div className="flex align-items-center justify-content-between">
              <p className="text-sm font-semibold text-color-secondary">{t('orderNumber')}</p>
              <p className="font-bold text-lg text-primary surface-card px-3 py-1 border-round shadow-1" style={{ fontFamily: 'monospace' }}>{state.orderNumber}</p>
            </div>
          </div>
          {user?.customerId && <OrderTracking orderNumber={state.orderNumber} customerId={user.customerId} />}
        </Dialog>
      </div>
    </div>
  );
};

export default Success;
