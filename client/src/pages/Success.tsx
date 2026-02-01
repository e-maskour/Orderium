import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Home, FileText, Receipt as ReceiptIcon, MapPin, Package, Sparkles, User, Phone } from 'lucide-react';
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
  const [documentType, setDocumentType] = useState<'receipt' | 'invoice'>('receipt');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');

  // Redirect if accessed directly without order data
  if (!state?.orderNumber || !state?.items || !state?.orderId) {
    return <Navigate to="/" replace />;
  }

  // Get orderId from state
  const orderId = state.orderId;

  const handlePreview = async (type: 'receipt' | 'invoice') => {
    const endpoint = type === 'receipt' 
      ? `/api/pdf/receipt/${orderId}?mode=preview`
      : `/api/pdf/delivery-note/${orderId}?mode=preview`;
    
    const title = type === 'receipt'
      ? t('receipt')
      : t('deliveryNote');
    
    setDocumentType(type);
    setPdfUrl(endpoint);
    setPdfTitle(`${title} ${state.orderNumber}`);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3" dir={dir}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Success animation */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center mx-auto shadow-2xl animate-scale-in">
            <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-emerald-400/30 mx-auto animate-ping" />
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-pulse" />
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-3 text-center">
            <h1 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
              {t('orderSuccess')}
            </h1>
            <p className="text-emerald-50 text-sm font-medium">
              {t('thankYou')}, {state.customerName}! 🎉
            </p>
          </div>

          {/* Order Details Section */}
          <div className="p-4 space-y-3">
            {/* Order Summary Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-3 border-2 border-emerald-200 dark:border-emerald-700 shadow-lg">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <ReceiptIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('orderNumber')}</span>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                  {state.orderNumber}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg">
                  <User className="w-4 h-4 text-teal-600" />
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('customer')}</p>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{state.customerName}</p>
                  </div>
                </div>
                
                {state.customerPhone && (
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg">
                    <Phone className="w-4 h-4 text-cyan-600" />
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('phone') || 'Phone'}</p>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{state.customerPhone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-300 dark:border-gray-600 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('total')}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {formatCurrency(state.total, language)}
                </span>
              </div>
            </div>

            {/* Order Tracking - Premium Design */}
            <Button
              onClick={() => setShowTracking(true)}
              size="sm"
              className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all group"
            >
              <Package className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm">{t('trackYourOrder')}</span>
            </Button>

            {/* Document Preview Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePreview('receipt')}
                  className="relative p-3 rounded-xl border-2 transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <ReceiptIcon className="w-6 h-6 mx-auto mb-1 text-white" />
                  <span className="block text-xs font-bold text-white">
                    {t('receipt')}
                  </span>
                </button>

                <button
                  onClick={() => handlePreview('invoice')}
                  className="relative p-3 rounded-xl border-2 transition-all duration-300 bg-gradient-to-br from-teal-500 to-cyan-500 border-teal-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <FileText className="w-6 h-6 mx-auto mb-1 text-white" />
                  <span className="block text-xs font-bold text-white">
                    {t('deliveryNote')}
                  </span>
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-2">
              <Link to="/" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 border-2 border-gray-300 dark:border-gray-600 hover:shadow-xl font-semibold transition-all"
                >
                  <Home className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">{t('backToHome')}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Document Preview Modal */}
        <PDFPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          pdfUrl={pdfUrl}
          title={pdfTitle}
        />

        {/* Order Tracking Modal */}
        <Dialog open={showTracking} onOpenChange={setShowTracking}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                {t('trackOrder')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 sm:mt-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-4 mb-6 border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('orderNumber')}</p>
                  <p className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm">
                    {state.orderNumber}
                  </p>
                </div>
              </div>
              {user?.customerId && (
                <OrderTracking orderNumber={state.orderNumber} customerId={user.customerId} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Success;
