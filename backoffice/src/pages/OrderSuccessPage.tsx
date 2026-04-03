import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  CheckCircle,
  Home,
  Download,
  Printer,
  Eye,
  FileText,
  Receipt as ReceiptIcon,
  Share2,
} from 'lucide-react';
import { Button } from 'primereact/button';
import { toastError, toastSuccess } from '../services/toast.service';
import { IOrderSuccessState as SuccessState } from '../modules/pos';
import { formatCurrency } from '@orderium/ui';
import { ordersService } from '../modules/orders/orders.service';
import { ShareDocumentDialog } from '../components/documents/ShareDocumentDialog';

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const state = location.state as SuccessState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [resolvedOrderId, setResolvedOrderId] = useState<number | null>(state?.orderId ?? null);
  const [previewType, setPreviewType] = useState<'receipt' | 'delivery-note' | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenExpiry, setShareTokenExpiry] = useState<Date | null>(null);

  useEffect(() => {
    if (!state || !state.orderNumber) {
      navigate('/pos');
      return;
    }
    if (!state.orderId && state.customer?.id) {
      fetch(`/api/orders/number/${state.orderNumber}?customerId=${state.customer.id}`)
        .then((res) => res.json())
        .then((data) => {
          const orderId = data?.order?.id;
          if (orderId) {
            setResolvedOrderId(orderId);
          }
        })
        .catch(() => {
          toastError(t('error'));
        });
    }
  }, [state, navigate, t]);

  if (!state || !state.orderNumber) {
    return null;
  }

  const ensureOrderId = () => {
    if (!resolvedOrderId) {
      toastError(t('error'));
      return false;
    }
    return true;
  };

  const handleDownload = (documentType: 'receipt' | 'delivery-note') => {
    if (!ensureOrderId()) return;
    setIsGenerating(true);
    try {
      const url =
        documentType === 'receipt'
          ? `/api/pdf/receipt/${resolvedOrderId}?mode=download`
          : `/api/pdf/delivery-note/${resolvedOrderId}?mode=download`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (documentType: 'receipt' | 'delivery-note') => {
    if (!ensureOrderId()) return;
    setPreviewType(documentType);
  };

  const closePreview = () => setPreviewType(null);

  const handleShare = async () => {
    try {
      if (resolvedOrderId && !shareToken) {
        const result = await ordersService.generateShareLink(resolvedOrderId);
        setShareToken(result.shareToken);
        setShareTokenExpiry(result.expiresAt);
        toastSuccess('Lien de partage généré');
      }
      setShowShareDialog(true);
    } catch (error: any) {
      toastError(error.message || 'Erreur lors de la génération du lien');
    }
  };

  const handleGenerateShareLink = async () => {
    if (!resolvedOrderId) return;
    const result = await ordersService.generateShareLink(resolvedOrderId);
    setShareToken(result.shareToken);
    setShareTokenExpiry(result.expiresAt);
  };

  const previewUrl = previewType
    ? previewType === 'receipt'
      ? `/api/pdf/receipt/${resolvedOrderId}?mode=preview`
      : `/api/pdf/delivery-note/${resolvedOrderId}?mode=preview`
    : '';

  const documents: {
    type: 'receipt' | 'delivery-note';
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    accentColor: string;
  }[] = [
    {
      type: 'receipt',
      label: t('receipt'),
      subtitle: t('thermalReceipt80mm'),
      icon: <ReceiptIcon style={{ width: '1.125rem', height: '1.125rem', color: '#2563eb' }} />,
      accentColor: '#2563eb',
    },
    {
      type: 'delivery-note',
      label: t('deliveryNote'),
      subtitle: t('deliveryNoteA5'),
      icon: <FileText style={{ width: '1.125rem', height: '1.125rem', color: '#7c3aed' }} />,
      accentColor: '#7c3aed',
    },
  ];

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: '#f3f4f6',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Success Hero */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '2rem 1.5rem',
          }}
        >
          <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '4.5rem',
                height: '4.5rem',
                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                borderRadius: '50%',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle style={{ width: '2.5rem', height: '2.5rem', color: '#059669' }} />
            </div>
            <h1
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 0.375rem',
              }}
            >
              {t('orderCreatedSuccessfully')}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              <span style={{ fontWeight: 600, color: '#059669' }}>{state.orderNumber}</span>
              {' · '}
              {state.customer.name}
              {' · '}
              {state.customer.phone}
            </p>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            maxWidth: '40rem',
            margin: '0 auto',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Summary strip */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div
                style={{ padding: '1rem', borderRight: '1px solid #f3f4f6', textAlign: 'center' }}
              >
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#9ca3af',
                    margin: '0 0 0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('total')}
                </p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {formatCurrency(state.total, language as 'fr' | 'ar')}
                </p>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRight: '1px solid #f3f4f6',
                  textAlign: 'center',
                  background: '#f0fdf4',
                }}
              >
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#059669',
                    margin: '0 0 0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Paid
                </p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', margin: 0 }}>
                  {formatCurrency(state.paidAmount, language as 'fr' | 'ar')}
                </p>
              </div>
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#9ca3af',
                    margin: '0 0 0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('change')}
                </p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', margin: 0 }}>
                  {formatCurrency(state.change, language as 'fr' | 'ar')}
                </p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            {documents.map((doc, idx) => (
              <div
                key={doc.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.875rem 1rem',
                  borderBottom: idx < documents.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    background: `${doc.accentColor}14`,
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {doc.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                    {doc.label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{doc.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', marginLeft: '0.75rem' }}>
                  <Button
                    text
                    rounded
                    onClick={() => handlePreview(doc.type)}
                    icon={<Eye style={{ width: '0.9375rem', height: '0.9375rem' }} />}
                    tooltip={t('preview')}
                    tooltipOptions={{ position: 'top' }}
                    style={{ width: '2.25rem', height: '2.25rem', color: '#6b7280' }}
                  />
                  <Button
                    text
                    rounded
                    onClick={() => handlePreview(doc.type)}
                    disabled={isGenerating}
                    icon={<Printer style={{ width: '0.9375rem', height: '0.9375rem' }} />}
                    tooltip={t('print')}
                    tooltipOptions={{ position: 'top' }}
                    style={{ width: '2.25rem', height: '2.25rem', color: '#6b7280' }}
                  />
                  <Button
                    rounded
                    onClick={() => handleDownload(doc.type)}
                    disabled={isGenerating}
                    loading={isGenerating}
                    icon={<Download style={{ width: '0.9375rem', height: '0.9375rem' }} />}
                    tooltip="Download"
                    tooltipOptions={{ position: 'top' }}
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      background: doc.accentColor,
                      border: 'none',
                      color: '#ffffff',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Primary actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              onClick={() => navigate('/pos')}
              label={t('backToPos') || 'New Order'}
              icon={<Home style={{ width: '1rem', height: '1rem' }} />}
              style={{
                flex: 1,
                height: '2.75rem',
                background: '#10b981',
                border: 'none',
                fontWeight: 600,
              }}
            />
            <Button
              onClick={handleShare}
              outlined
              icon={<Share2 style={{ width: '1rem', height: '1rem' }} />}
              label="Share"
              style={{
                height: '2.75rem',
                paddingInline: '1.25rem',
                fontWeight: 600,
                borderColor: '#d1d5db',
                color: '#374151',
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview Drawer */}
      {previewType && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={closePreview}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '100%',
              maxWidth: '480px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
                  {previewType === 'receipt' ? t('receipt') : t('deliveryNote')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('preview')}</p>
              </div>
              <Button
                text
                rounded
                onClick={closePreview}
                label="✕"
                aria-label="Close preview"
                style={{ width: '2rem', height: '2rem', background: '#f3f4f6' }}
              />
            </div>
            <div style={{ flex: 1, background: '#f9fafb' }}>
              <iframe
                title="PDF Preview"
                src={previewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {showShareDialog && (
        <ShareDocumentDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          documentType="bon_livraison"
          documentNumber={state.orderNumber}
          partnerName={state.customer.name}
          partnerPhone={state.customer.phone}
          totalAmount={state.total}
          shareToken={shareToken}
          expiresAt={shareTokenExpiry}
          onGenerateLink={handleGenerateShareLink}
        />
      )}
    </>
  );
}
