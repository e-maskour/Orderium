import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X, Download, Eye, FileText, Receipt as ReceiptIcon, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Receipt } from '../../../client/src/components/Receipt';
import { Invoice } from '../../../client/src/components/Invoice';
import { LanguageProvider } from '../context/LanguageContext';
import { useLanguage } from '../context/LanguageContext';

interface CartItem {
  product: {
    Id: number;
    Name: string;
    Price: number;
    Description?: string;
  };
  quantity: number;
}

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CartItem[];
  total: number;
  orderDate: Date;
}

export const OrderSuccessModal = ({
  isOpen,
  onClose,
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  items,
  total,
  orderDate,
}: OrderSuccessModalProps) => {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewType, setPreviewType] = useState<'receipt' | 'invoice' | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (documentType: 'receipt' | 'invoice') => {
    setIsGenerating(true);
    try {
      // Create off-screen container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-99999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Convert items to expected format
      const formattedItems = items.map(item => ({
        product: {
          Id: item.product.Id,
          Name: item.product.Name,
          Price: item.product.Price,
          Description: item.product.Description || '',
          CategoryId: 0,
          ImageUrl: '',
          Code: '',
          Stock: 0,
          Cost: 0,
          IsService: false,
          IsEnabled: true,
          DateCreated: '',
          DateUpdated: '',
        },
        quantity: item.quantity
      }));

      // Render component
      const root = createRoot(container);
      
      if (documentType === 'receipt') {
        root.render(
          <LanguageProvider>
            <Receipt
              orderNumber={orderNumber}
              customerName={customerName}
              customerPhone={customerPhone}
              items={formattedItems}
              subtotal={total}
              orderDate={orderDate}
            />
          </LanguageProvider>
        );
      } else {
        root.render(
          <LanguageProvider>
            <Invoice
              orderNumber={orderNumber}
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress || ''}
              items={formattedItems}
              subtotal={total}
              orderDate={orderDate}
            />
          </LanguageProvider>
        );
      }

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get element
      const element = container.querySelector(documentType === 'receipt' ? '#receipt-content' : '#invoice-content') as HTMLElement;
      if (!element) {
        throw new Error('Element not found');
      }

      // Capture as canvas
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Create PDF
      if (documentType === 'receipt') {
        const imgWidth = 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [imgWidth, imgHeight],
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Receipt_${orderNumber}.pdf`);
      } else {
        const a5Width = 148;
        const imgWidth = a5Width;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a5',
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Invoice_${orderNumber}.pdf`);
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(container);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (type: 'receipt' | 'invoice') => {
    setPreviewType(type);
  };

  const closePreview = () => {
    setPreviewType(null);
  };

  return (
    <>
      {/* Main Success Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center border-b border-green-100">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('orderCreatedSuccessfully')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('orderNumber')}: <span className="font-semibold text-green-700">{orderNumber}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-center text-gray-600 text-sm">
              {t('downloadDocuments')}
            </p>

            {/* Receipt Actions */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{t('receipt')}</h3>
                  <p className="text-xs text-gray-600">{t('thermalReceipt80mm')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview('receipt')}
                  className="flex-1 bg-white hover:bg-gray-50 text-blue-700 font-medium py-2 px-4 rounded-lg border border-blue-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {t('preview')}
                </button>
                <button
                  onClick={() => handleDownload('receipt')}
                  disabled={isGenerating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isGenerating ? t('generating') : t('download')}
                </button>
              </div>
            </div>

            {/* Invoice Actions */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{t('invoice')}</h3>
                  <p className="text-xs text-gray-600">{t('deliveryNoteA5')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview('invoice')}
                  className="flex-1 bg-white hover:bg-gray-50 text-amber-700 font-medium py-2 px-4 rounded-lg border border-amber-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {t('preview')}
                </button>
                <button
                  onClick={() => handleDownload('invoice')}
                  disabled={isGenerating}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isGenerating ? t('generating') : t('download')}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {t('close')}
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-md transition-all"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closePreview}
          />
          
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewType === 'receipt' ? t('receipt') : t('invoice')} - {t('preview')}
              </h3>
              <button
                onClick={closePreview}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            
            <div className="p-6">
              {previewType === 'receipt' ? (
                <Receipt
                  orderNumber={orderNumber}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  items={items.map(item => ({
                    product: {
                      Id: item.product.Id,
                      Name: item.product.Name,
                      Price: item.product.Price,
                      Description: item.product.Description || '',
                      CategoryId: 0,
                      ImageUrl: '',
                      Code: '',
                      Stock: 0,
                      Cost: 0,
                      IsService: false,
                      IsEnabled: true,
                      DateCreated: '',
                      DateUpdated: '',
                    },
                    quantity: item.quantity
                  }))}
                  subtotal={total}
                  orderDate={orderDate}
                />
              ) : (
                <Invoice
                  orderNumber={orderNumber}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerAddress={customerAddress || ''}
                  items={items.map(item => ({
                    product: {
                      Id: item.product.Id,
                      Name: item.product.Name,
                      Price: item.product.Price,
                      Description: item.product.Description || '',
                      CategoryId: 0,
                      ImageUrl: '',
                      Code: '',
                      Stock: 0,
                      Cost: 0,
                      IsService: false,
                      IsEnabled: true,
                      DateCreated: '',
                      DateUpdated: '',
                    },
                    quantity: item.quantity
                  }))}
                  subtotal={total}
                  orderDate={orderDate}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
