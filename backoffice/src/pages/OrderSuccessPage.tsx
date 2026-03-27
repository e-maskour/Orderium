import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, Home, Download, Printer, Eye, FileText, Receipt as ReceiptIcon, Share2, MessageCircle } from 'lucide-react';
import { Button } from 'primereact/button';
import { toastError, toastSuccess } from '../services/toast.service';
import { IPosCartItem as CartItem, ICheckoutCustomer as Customer, IOrderSuccessState as SuccessState } from '../modules/pos';
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
      const url = documentType === 'receipt'
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
    ? (previewType === 'receipt'
      ? `/api/pdf/receipt/${resolvedOrderId}?mode=preview`
      : `/api/pdf/delivery-note/${resolvedOrderId}?mode=preview`)
    : '';

  return (
    <>
      <div style={{ minHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff, #eff6ff)' }}>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Success Header */}
          <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3.5rem', height: '3.5rem', background: '#10b981', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <CheckCircle style={{ width: '2rem', height: '2rem', color: '#ffffff' }} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{t('orderCreatedSuccessfully')}</h1>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {t('orderNumber')}: <span style={{ fontWeight: 600, color: '#047857' }}>{state.orderNumber}</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {state.customer.name} • {state.customer.phone}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/pos')}
                  label="Back to POS"
                  icon={<Home style={{ width: '1rem', height: '1rem' }} />}
                  style={{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Order Summary - Top */}
              <div style={{ background: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ width: '2rem', height: '2rem', background: '#ecfdf5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                  </div>
                  <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>Order Summary</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6' }}>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{t('total')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(state.total, language as 'fr' | 'ar')}</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '0.75rem', border: '1px solid #d1fae5' }}>
                    <p style={{ fontSize: '0.75rem', color: '#047857', marginBottom: '0.25rem' }}>Paid</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#047857' }}>{formatCurrency(state.paidAmount, language as 'fr' | 'ar')}</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #dbeafe' }}>
                    <p style={{ fontSize: '0.75rem', color: '#1d4ed8', marginBottom: '0.25rem' }}>{t('change')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1d4ed8' }}>{formatCurrency(state.change, language as 'fr' | 'ar')}</p>
                  </div>
                </div>
              </div>

              {/* Documents Cards - Below */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {/* Receipt Card */}
                <div style={{ background: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '2rem', height: '2rem', background: '#eff6ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ReceiptIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{t('receipt')}</h2>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('thermalReceipt80mm')}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '1rem', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Button
                      onClick={() => handlePreview('receipt')}
                      text
                      label={t('preview')}
                      icon={<Eye style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#eff6ff', color: '#1d4ed8' }}
                    />
                    <Button
                      onClick={() => handlePreview('receipt')}
                      disabled={isGenerating}
                      label={t('print')}
                      icon={<Printer style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#3b82f6', color: '#ffffff' }}
                    />
                    <Button
                      onClick={() => handleDownload('receipt')}
                      disabled={isGenerating}
                      loading={isGenerating}
                      label={isGenerating ? t('generating') : 'Download'}
                      icon={<Download style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#2563eb', color: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Delivery Note Card */}
                <div style={{ background: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '2rem', height: '2rem', background: '#eff6ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{t('deliveryNote')}</h2>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('deliveryNoteA5')}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '1rem', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Button
                      onClick={() => handlePreview('delivery-note')}
                      text
                      label={t('preview')}
                      icon={<Eye style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#fffbeb', color: '#b45309' }}
                    />
                    <Button
                      onClick={() => handlePreview('delivery-note')}
                      disabled={isGenerating}
                      label={t('print')}
                      icon={<Printer style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#235ae4', color: '#ffffff' }}
                    />
                    <Button
                      onClick={() => handleDownload('delivery-note')}
                      disabled={isGenerating}
                      loading={isGenerating}
                      label={isGenerating ? t('generating') : 'Download'}
                      icon={<Download style={{ width: '1rem', height: '1rem' }} />}
                      style={{ width: '100%', height: '4rem', background: '#1a47b8', color: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Back to POS Button */}
                <Button
                  onClick={() => navigate('/pos')}
                  label="Back to POS"
                  icon={<Home style={{ width: '1rem', height: '1rem' }} />}
                  style={{ gridColumn: 'span 2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '3rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />

                {/* Share + WhatsApp */}
                <Button
                  onClick={handleShare}
                  icon={<Share2 style={{ width: '1.125rem', height: '1.125rem' }} />}
                  label="Partager"
                  outlined
                  style={{ height: '3.5rem', fontSize: '0.9375rem', fontWeight: 600, borderColor: '#235ae4', color: '#235ae4' }}
                />
                <Button
                  onClick={handleShare}
                  icon={<MessageCircle style={{ width: '1.125rem', height: '1.125rem' }} />}
                  label="WhatsApp"
                  style={{ height: '3.5rem', fontSize: '0.9375rem', fontWeight: 700, background: '#25D366', border: 'none', color: '#fff' }}
                />
              </div>
            </div>
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
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%', maxWidth: '480px', background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
