import { FileDown, Eye } from 'lucide-react';
import { useState } from 'react';
import { pdfService, DocumentType, PDFMode } from '../services/pdf.service';
import { toastExported, toastError } from '../services/toast.service';
import { PDFPreviewModal } from './PDFPreviewModal';
import { useLanguage } from '../context/LanguageContext';

interface PDFActionButtonsProps {
  documentType: DocumentType;
  documentId: number;
  documentNumber?: string;
  showPreview?: boolean;
  showDownload?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PDFActionButtons({
  documentType,
  documentId,
  documentNumber,
  showPreview = true,
  showDownload = true,
  className = '',
  size = 'md',
}: PDFActionButtonsProps) {
  const { t } = useLanguage();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handlePDFAction = async (mode: PDFMode) => {
    try {
      if (mode === 'preview') {
        // Get PDF URL and show in modal
        const url = pdfService.getPDFUrl(documentType, documentId, 'preview');
        setPdfUrl(url);
        setShowPreviewModal(true);
      } else {
        // Download PDF
        await pdfService.download({
          documentType,
          documentId,
          mode,
        });

        toastExported(
          `${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''} ${t('pdfDownloaded')}`
        );
      }
    } catch (error: any) {
      console.error('PDF action failed:', error);
      toastError(error.message || t('errorGeneratingPDF'));
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2.5 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 20;
      default:
        return 16;
    }
  };

  const iconSize = getIconSize();
  const sizeClasses = getSizeClasses();

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        {showPreview && (
          <button
            onClick={() => handlePDFAction('preview')}
            className={`${sizeClasses} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2`}
            title={`Prévisualiser ${pdfService.getDocumentLabel(documentType)}`}
          >
            <Eye size={iconSize} />
            <span>Prévisualiser</span>
          </button>
        )}

        {showDownload && (
          <button
            onClick={() => handlePDFAction('download')}
            className={`${sizeClasses} bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center gap-2`}
            title={`Télécharger ${pdfService.getDocumentLabel(documentType)}`}
          >
            <FileDown size={iconSize} />
            <span>{t('download')}</span>
          </button>
        )}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        pdfUrl={pdfUrl}
        title={`${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''}`}
      />
    </>
  );
}

// Compact version with icon-only buttons
export function PDFIconButtons({
  documentType,
  documentId,
  documentNumber,
  showPreview = true,
  showDownload = true,
  className = '',
}: PDFActionButtonsProps) {
  const { t } = useLanguage();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handlePDFAction = async (mode: PDFMode) => {
    try {
      if (mode === 'preview') {
        // Get PDF URL and show in modal
        const url = pdfService.getPDFUrl(documentType, documentId, 'preview');
        setPdfUrl(url);
        setShowPreviewModal(true);
      } else {
        // Download PDF
        await pdfService.download({
          documentType,
          documentId,
          mode,
        });

        toastExported(
          `${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''} ${t('pdfDownloadedShort')}`
        );
      }
    } catch (error: any) {
      console.error('PDF action failed:', error);
      toastError(error.message || t('errorGeneratingPDF'));
    }
  };

  return (
    <>
      <div className={`flex gap-1 ${className}`}>
        {showPreview && (
          <button
            onClick={() => handlePDFAction('preview')}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            title={`Prévisualiser ${pdfService.getDocumentLabel(documentType)}`}
          >
            <Eye size={16} />
          </button>
        )}

        {showDownload && (
          <button
            onClick={() => handlePDFAction('download')}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            title={`Télécharger ${pdfService.getDocumentLabel(documentType)}`}
          >
            <FileDown size={16} />
          </button>
        )}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        pdfUrl={pdfUrl}
        title={`${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''}`}
      />
    </>
  );
}
