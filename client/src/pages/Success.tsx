import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Home, Download, Eye, FileText, Receipt as ReceiptIcon, X } from 'lucide-react';
import { Receipt } from '@/components/Receipt';
import { Invoice } from '@/components/Invoice';
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
  const state = location.state as SuccessState | null;
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [documentType, setDocumentType] = useState<'receipt' | 'invoice'>('receipt');
  const [isGenerating, setIsGenerating] = useState(false);

  // Redirect if accessed directly without order data
  if (!state?.orderNumber || !state?.items) {
    return <Navigate to="/" replace />;
  }

  const handlePreview = () => {
    setShowPreview(!showPreview);
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
        `${documentType === 'invoice' 
          ? (language === 'ar' ? 'وصل التسليم' : 'Bon_de_Livraison') 
          : (language === 'ar' ? 'وصل' : 'Reçu')
        }_${state.orderNumber}.pdf`
      );

      // Hide preview again if it was hidden
      if (wasHidden) setShowPreview(false);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(language === 'ar' ? 'فشل في إنشاء الوثيقة' : 'Échec de génération du document');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="max-w-4xl w-full text-center">
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto shadow-lg animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-400/30 mx-auto animate-ping" />
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 shadow-medium animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
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

          {/* Document Type Selection */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              {language === 'ar' ? 'اختر نوع الوثيقة:' : 'Choisir le type de document:'}
            </p>
            <div className="grid grid-cols-2 gap-4">
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
                  {language === 'ar' ? 'وصل' : 'Reçu'}
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
                  {language === 'ar' ? 'وصل التسليم' : 'Bon de Livraison'}
                </span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={handlePreview}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Eye className="w-5 h-5 mr-2" />
              {language === 'ar'
                ? `معاينة ${documentType === 'invoice' ? 'وصل التسليم' : 'الوصل'}`
                : `Aperçu ${documentType === 'invoice' ? 'Bon de Livraison' : 'Reçu'}`
              }
            </Button>

            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {language === 'ar' ? 'جاري الإنشاء...' : 'Génération...'}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  {language === 'ar'
                    ? `تحميل PDF`
                    : `Télécharger PDF`
                  }
                </>
              )}
            </Button>
          </div>

          <Link to="/" className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 border-2 hover:bg-gray-100 hover:text-gray-900 font-semibold transition-all"
            >
              <Home className="w-5 h-5 mr-2" />
              {t('backToHome')}
            </Button>
          </Link>
        </div>

        {/* Document Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {language === 'ar'
                  ? `معاينة ${documentType === 'invoice' ? 'وصل التسليم' : 'الوصل'}`
                  : `Aperçu ${documentType === 'invoice' ? 'Bon de Livraison' : 'Reçu'}`
                }
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
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
