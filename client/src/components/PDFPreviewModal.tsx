import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function PDFPreviewModal({ isOpen, onClose, pdfUrl, title }: PDFPreviewModalProps) {
  const { t, language, dir } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir={dir}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-7xl h-[98vh] sm:h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg sm:rounded-t-xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 truncate pr-2">
            {language === 'ar' ? `معاينة ${title}` : `Aperçu ${title}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-900">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
              <div className="text-center px-4">
                <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3 sm:mb-4"></div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                  {language === 'ar' ? 'جاري تحميل المستند...' : 'Chargement du PDF...'}
                </p>
              </div>
            </div>
          )}
          
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
