import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';

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
    if (isOpen) setIsLoading(true);
  }, [isOpen, pdfUrl]);

  const headerLabel = language === 'ar' ? `معاينة ${title}` : `Aperçu ${title}`;

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={headerLabel}
      modal
      maximizable
      className="w-full"
      style={{ maxWidth: '80rem', height: '95vh' }}
      contentStyle={{ padding: 0, flex: 1, overflow: 'hidden', position: 'relative' }}
      dir={dir}
    >
      {isLoading && (
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: 'var(--surface-ground)', zIndex: 1 }}>
          <div className="text-center">
            <ProgressSpinner style={{ width: '3rem', height: '3rem' }} />
            <p className="text-color-secondary font-medium mt-3">
              {language === 'ar' ? 'جاري تحميل المستند...' : 'Chargement du PDF...'}
            </p>
          </div>
        </div>
      )}
      <iframe
        src={pdfUrl}
        className="w-full h-full border-none"
        title={title}
        onLoad={() => setIsLoading(false)}
      />
    </Dialog>
  );
}
