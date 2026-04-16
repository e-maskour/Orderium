import { FileDown, Eye } from 'lucide-react';
import { useState } from 'react';
import { pdfService, DocumentType, PDFMode } from '../services/pdf.service';
import { toastExported, toastError } from '../services/toast.service';
import { PDFPreviewModal, prefetchPDF } from './PDFPreviewModal';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';

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
}: PDFActionButtonsProps) {
  const { t, language } = useLanguage();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handlePDFAction = async (mode: PDFMode) => {
    try {
      if (mode === 'preview') {
        const url = pdfService.getPDFUrl(documentType, documentId, 'preview', language);
        setPdfUrl(url);
        setShowPreviewModal(true);
      } else {
        await pdfService.download({ documentType, documentId, mode, lang: language });
        toastExported(
          `${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''} ${t('pdfDownloaded')}`,
        );
      }
    } catch (error: any) {
      console.error('PDF action failed:', error);
      toastError(error.message || t('errorGeneratingPDF'));
    }
  };

  const handlePreviewMouseEnter = () => {
    prefetchPDF(pdfService.getPDFUrl(documentType, documentId, 'preview', language));
  };

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        {showPreview && (
          <Button
            icon={<Eye size={16} />}
            label="Prévisualiser"
            onClick={() => handlePDFAction('preview')}
            onMouseEnter={handlePreviewMouseEnter}
            style={{ background: '#2563eb', borderColor: '#2563eb' }}
            size="small"
          />
        )}
        {showDownload && (
          <Button
            icon={<FileDown size={16} />}
            label={t('download')}
            onClick={() => handlePDFAction('download')}
            severity="success"
            size="small"
          />
        )}
      </div>

      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        pdfUrl={pdfUrl}
        title={`${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''}`}
      />
    </>
  );
}

export function PDFIconButtons({
  documentType,
  documentId,
  documentNumber,
  showPreview = true,
  showDownload = true,
  className = '',
}: PDFActionButtonsProps) {
  const { t, language } = useLanguage();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handlePDFAction = async (mode: PDFMode) => {
    try {
      if (mode === 'preview') {
        const url = pdfService.getPDFUrl(documentType, documentId, 'preview', language);
        setPdfUrl(url);
        setShowPreviewModal(true);
      } else {
        await pdfService.download({ documentType, documentId, mode, lang: language });
        toastExported(
          `${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''} ${t('pdfDownloadedShort')}`,
        );
      }
    } catch (error: any) {
      console.error('PDF action failed:', error);
      toastError(error.message || t('errorGeneratingPDF'));
    }
  };

  const handlePreviewMouseEnter = () => {
    prefetchPDF(pdfService.getPDFUrl(documentType, documentId, 'preview', language));
  };

  return (
    <>
      <div className={`flex gap-1 ${className}`}>
        {showPreview && (
          <Button
            icon={<Eye size={16} />}
            text
            rounded
            onClick={() => handlePDFAction('preview')}
            onMouseEnter={handlePreviewMouseEnter}
            style={{ color: '#2563eb' }}
            tooltip={`Prévisualiser ${pdfService.getDocumentLabel(documentType)}`}
          />
        )}
        {showDownload && (
          <Button
            icon={<FileDown size={16} />}
            text
            rounded
            severity="success"
            onClick={() => handlePDFAction('download')}
            tooltip={`Télécharger ${pdfService.getDocumentLabel(documentType)}`}
          />
        )}
      </div>

      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        pdfUrl={pdfUrl}
        title={`${pdfService.getDocumentLabel(documentType)} ${documentNumber || ''}`}
      />
    </>
  );
}
