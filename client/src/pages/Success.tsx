import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Home, Download, Eye, FileText, Receipt as ReceiptIcon, X, Share2, MapPin, Package } from 'lucide-react';
import { Receipt } from '@/components/Receipt';
import { Invoice } from '@/components/Invoice';
import { OrderTracking } from '@/components/OrderTracking';
import { CartItem } from '@/context/CartContext';
import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SuccessState {
  orderNumber: string;
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
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [documentType, setDocumentType] = useState<'receipt' | 'invoice'>('receipt');
  const [isGenerating, setIsGenerating] = useState(false);

  // Redirect if accessed directly without order data
  if (!state?.orderNumber || !state?.items) {
    return <Navigate to="/" replace />;
  }

  const handlePreview = () => {
    setShowPreview(!showPreview);
  };

  const handleShareWhatsApp = () => {
    const message = language === 'ar'
      ? `تم تأكيد طلبك بنجاح!\n\nرقم الطلب: ${state.orderNumber}\nالعميل: ${state.customerName}\nالمبلغ الإجمالي: ${formatCurrency(state.total, language)}\n\nشكراً لتعاملك معنا!`
      : `Votre commande a été confirmée avec succès!\n\nNuméro de commande: ${state.orderNumber}\nClient: ${state.customerName}\nMontant total: ${formatCurrency(state.total, language)}\n\nMerci pour votre confiance!`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    try {
      // Temporarily show the receipt for rendering
      const wasHidden = !showPreview;
      if (wasHidden) setShowPreview(true);

      // Wait for next tick to ensure DOM is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(
        `${documentType === 'invoice' ? t('deliveryNote') : t('receipt')}_${state.orderNumber}.pdf`
      );

      // Hide preview again if it was hidden
      if (wasHidden) setShowPreview(false);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(t('documentGenerationFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4" dir={dir}>
      <div className="max-w-4xl w-full text-center">
        {/* Success animation */}
        <div className="relative mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto shadow-lg animate-scale-in">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
          </div>
          <div className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-400/30 mx-auto animate-ping" />
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-medium animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('orderSuccess')}
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {t('thankYou')}, {state.customerName}!
          </p>

          {/* Order details */}
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">{t('orderNumber')}</span>
              <span className="font-mono font-bold text-primary">{state.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('total')}</span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(state.total, language)}
              </span>
            </div>
          </div>

          {/* Order Tracking Button - Animated */}
          <div className="mb-6">
            <Button
              onClick={() => setShowTracking(true)}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
              
              {/* Icon with animation */}
              <Package className="w-5 h-5 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
              
              {/* Text */}
              <span className="relative z-10">
                {t('trackYourOrder')}
              </span>
              
              {/* Moving dot indicator */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </Button>
          </div>

          {/* Document Type Selection */}
          <div className="mb-6 sm:mb-8">
            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4">
              {t('chooseDocumentType')}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Button
                variant={documentType === 'receipt' ? 'default' : 'outline'}
                onClick={() => setDocumentType('receipt')}
                size="lg"
                className={`h-20 flex flex-col gap-2 transition-all ${
                  documentType === 'receipt'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg scale-105 text-white'
                    : 'hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <ReceiptIcon className="w-6 h-6" />
                <span className="text-sm font-semibold">
                  {t('receipt')}
                </span>
              </Button>
              <Button
                variant={documentType === 'invoice' ? 'default' : 'outline'}
                onClick={() => setDocumentType('invoice')}
                size="lg"
                className={`h-20 flex flex-col gap-2 transition-all ${
                  documentType === 'invoice'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg scale-105 text-white'
                    : 'hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm font-semibold">
                  {t('deliveryNote')}
                </span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <Button
              onClick={handlePreview}
              size="lg"
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('preview')} {documentType === 'invoice' ? t('deliveryNote') : t('receipt')}
            </Button>

            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              size="lg"
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-sm sm:text-base"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t('download')} PDF
                </>
              )}
            </Button>

            <Button
              onClick={handleShareWhatsApp}
              size="lg"
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('shareWhatsApp')}
            </Button>
          </div>

          <Link to="/" className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-11 sm:h-12 border-2 hover:bg-gray-100 hover:text-gray-900 font-semibold transition-all text-sm sm:text-base"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('backToHome')}
            </Button>
          </Link>
        </div>

        {/* Document Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg md:text-xl font-bold">
                {`${t('previewDocument')} ${documentType === 'invoice' ? t('deliveryNote') : t('receipt')}`}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-3 sm:mt-4 overflow-x-auto">
              <div className="min-w-[300px] scale-90 sm:scale-95 md:scale-100 origin-top">
              {documentType === 'receipt' ? (
                <Receipt
                  orderNumber={state.orderNumber}
                  customerName={state.customerName}
                  customerPhone={state.customerPhone || ''}
                  customerAddress={state.customerAddress}
                  items={state.items}
                  subtotal={state.total}
                  orderDate={new Date()}
                />
              ) : (
                <Invoice
                  orderNumber={state.orderNumber}
                  customerName={state.customerName}
                  customerPhone={state.customerPhone || ''}
                  customerAddress={state.customerAddress}
                  items={state.items}
                  subtotal={state.total}
                  orderDate={new Date()}
                />
              )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Tracking Modal */}
        <Dialog open={showTracking} onOpenChange={setShowTracking}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {t('trackOrder')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground">{t('orderNumber')}</p>
                <p className="font-mono font-bold text-primary">{state.orderNumber}</p>
              </div>
              {user?.CustomerId && (
                <OrderTracking orderNumber={state.orderNumber} customerId={user.CustomerId} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden Document for PDF Generation */}
        <div ref={receiptRef} className="hidden">
          {documentType === 'receipt' ? (
            <Receipt
              orderNumber={state.orderNumber}
              customerName={state.customerName}
              customerPhone={state.customerPhone || ''}
              customerAddress={state.customerAddress}
              items={state.items}
              subtotal={state.total}
              orderDate={new Date()}
            />
          ) : (
            <Invoice
              orderNumber={state.orderNumber}
              customerName={state.customerName}
              customerPhone={state.customerPhone || ''}
              customerAddress={state.customerAddress}
              items={state.items}
              subtotal={state.total}
              orderDate={new Date()}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Success;
