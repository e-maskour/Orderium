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

function isMobileBrowser(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export function PDFPreviewModal({ isOpen, onClose, pdfUrl, title }: PDFPreviewModalProps) {
  const { language, dir } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const mobile = isMobileBrowser();

  useEffect(() => {
    if (isOpen) setIsLoading(true);
  }, [isOpen, pdfUrl]);

  const headerLabel = language === 'ar' ? `معاينة ${title}` : `Aperçu ${title}`;
  const openLabel = language === 'ar' ? 'فتح الملف PDF' : 'Ouvrir le PDF';
  const mobileHintLabel = language === 'ar'
    ? 'اضغط على الزر أدناه لفتح الملف'
    : 'Appuyez sur le bouton ci-dessous pour ouvrir le PDF';

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
      {isLoading && !mobile && (
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: 'var(--surface-ground)', zIndex: 1 }}>
          <div className="text-center">
            <ProgressSpinner style={{ width: '3rem', height: '3rem' }} />
            <p className="text-color-secondary font-medium mt-3">
              {language === 'ar' ? 'جاري تحميل المستند...' : 'Chargement du PDF...'}
            </p>
          </div>
        </div>
      )}

      {!mobile && (
        <iframe
          src={pdfUrl}
          className="w-full h-full border-none"
          title={title}
          onLoad={() => setIsLoading(false)}
        />
      )}

      {mobile && pdfUrl && (
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: 'var(--surface-ground)', padding: '2rem' }}>
          <div className="text-center">
            <p className="text-color-secondary font-medium mb-4">{mobileHintLabel}</p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'var(--primary-color, #2563eb)',
                color: '#fff',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
              }}
            >
              {openLabel}
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}
