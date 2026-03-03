import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function PDFPreviewModal({ isOpen, onClose, pdfUrl, title }: PDFPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, pdfUrl]);

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={`Aperçu ${title}`}
      modal
      dismissableMask
      maximizable
      style={{ width: '90vw', maxWidth: '80rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      contentStyle={{ height: '80vh', padding: 0, position: 'relative', background: '#f1f5f9', overflow: 'hidden' }}
    >
      {isLoading && (
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: '#f1f5f9', zIndex: 1 }}>
          <div className="text-center">
            <ProgressSpinner style={{ width: '3rem', height: '3rem' }} />
            <p className="font-medium mt-3" style={{ color: '#475569' }}>Chargement du PDF...</p>
          </div>
        </div>
      )}

      <iframe
        src={pdfUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title={title}
        onLoad={() => setIsLoading(false)}
      />
    </Dialog>
  );
}
