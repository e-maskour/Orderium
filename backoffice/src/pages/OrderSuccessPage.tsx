import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, Home, Download, Printer, Eye, FileText, Receipt as ReceiptIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toastError } from '../services/toast.service';
import { IPosCartItem as CartItem, ICheckoutCustomer as Customer, IOrderSuccessState as SuccessState } from '../modules/pos';

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const state = location.state as SuccessState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [resolvedOrderId, setResolvedOrderId] = useState<number | null>(state?.orderId ?? null);
  const [previewType, setPreviewType] = useState<'receipt' | 'delivery-note' | null>(null);

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

  const formatCurrency = (price: number) => {
    return language === 'ar'
      ? `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.م.`
      : `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
  };

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

  const previewUrl = previewType
    ? (previewType === 'receipt'
      ? `/api/pdf/receipt/${resolvedOrderId}?mode=preview`
      : `/api/pdf/delivery-note/${resolvedOrderId}?mode=preview`)
    : '';

  return (
    <>
      <div className="min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="h-screen flex flex-col">
          {/* Success Header */}
          <div className="bg-white/80 backdrop-blur border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-2xl shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('orderCreatedSuccessfully')}</h1>
                    <p className="text-sm text-gray-500">
                      {t('orderNumber')}: <span className="font-semibold text-emerald-700">{state.orderNumber}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {state.customer.name} • {state.customer.phone}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/pos')}
                  className="hidden sm:inline-flex shadow-lg"
                  leadingIcon={Home}
                >
                  Back to POS
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
              {/* Order Summary - Top */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">{t('total')}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(state.total)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-700 mb-1">Paid</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(state.paidAmount)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 mb-1">{t('change')}</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(state.change)}</p>
                  </div>
                </div>
              </div>

              {/* Documents Cards - Below */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Receipt Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <ReceiptIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{t('receipt')}</h2>
                        <p className="text-xs text-gray-500">{t('thermalReceipt80mm')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-2 space-y-3">
                    <Button
                      onClick={() => handlePreview('receipt')}
                      variant="ghost"
                      className="w-full h-16 bg-blue-50 hover:bg-blue-100 text-blue-700"
                      leadingIcon={Eye}
                    >
                      {t('preview')}
                    </Button>
                    <Button
                      onClick={() => handlePreview('receipt')}
                      disabled={isGenerating}
                      className="w-full h-16 bg-blue-500 hover:bg-blue-600 text-white"
                      leadingIcon={Printer}
                    >
                      {t('print')}
                    </Button>
                    <Button
                      onClick={() => handleDownload('receipt')}
                      disabled={isGenerating}
                      loading={isGenerating}
                      loadingText={t('generating')}
                      className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white"
                      leadingIcon={Download}
                    >
                      Download
                    </Button>
                  </div>
                </div>

                {/* Delivery Note Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{t('deliveryNote')}</h2>
                        <p className="text-xs text-gray-500">{t('deliveryNoteA5')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-2 space-y-3">
                    <Button
                      onClick={() => handlePreview('delivery-note')}
                      variant="ghost"
                      className="w-full h-16 bg-amber-50 hover:bg-amber-100 text-amber-700"
                      leadingIcon={Eye}
                    >
                      {t('preview')}
                    </Button>
                    <Button
                      onClick={() => handlePreview('delivery-note')}
                      disabled={isGenerating}
                      className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white"
                      leadingIcon={Printer}
                    >
                      {t('print')}
                    </Button>
                    <Button
                      onClick={() => handleDownload('delivery-note')}
                      disabled={isGenerating}
                      loading={isGenerating}
                      loadingText={t('generating')}
                      className="w-full h-16 bg-amber-600 hover:bg-amber-700 text-white"
                      leadingIcon={Download}
                    >
                      Download
                    </Button>
                  </div>
                </div>

                {/* Back to POS Button */}
                <Button
                  onClick={() => navigate('/pos')}
                  className="lg:col-span-2 hidden sm:inline-flex items-center justify-center h-12 shadow-lg sm:flex"
                  leadingIcon={Home}
                >
                  Back to POS
                </Button>
              </div>

              {/* Mobile Back to POS */}
              <Button
                onClick={() => navigate('/pos')}
                className="sm:hidden w-full h-12 shadow-lg"
                leadingIcon={Home}
              >
                Back to POS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Drawer */}
      {previewType && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closePreview}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-[480px] bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {previewType === 'receipt' ? t('receipt') : t('deliveryNote')}
                </h3>
                <p className="text-xs text-gray-500">{t('preview')}</p>
              </div>
              <button
                onClick={closePreview}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-50">
              <iframe
                title="PDF Preview"
                src={previewUrl}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
