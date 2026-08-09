import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { useLanguage } from '../../../context/LanguageContext';
import { useReportPdf } from '../../../hooks/useReportPdf';
import type {
  AnyReportFilter,
  PdfReportSpec,
} from '../../../modules/analytics/analytics.interface';

/** Maps the UI language onto the BCP-47 locale the PDF engine formats with. */
const PDF_LOCALES: Record<string, string> = { fr: 'fr-MA', ar: 'ar-MA' };

interface ExportButtonsProps {
  xlsxUrl?: string;
  xlsxFilename?: string;
  /**
   * Presentation spec for the PDF export. When provided, the PDF button renders
   * and generates the document server-side from the current `filter`.
   */
  pdf?: PdfReportSpec;
  /** Filter currently applied on screen — forwarded to the PDF export. */
  filter?: AnyReportFilter;
  /** Escape hatch for pages that handle the PDF action themselves. */
  onPdf?: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  xlsxUrl,
  xlsxFilename = 'rapport.xlsx',
  pdf,
  filter,
  onPdf,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { t, language } = useLanguage();

  const {
    download: downloadPdf,
    isGenerating,
    error: pdfError,
  } = useReportPdf(pdf, filter ?? {}, PDF_LOCALES[language] ?? 'fr-MA');

  const handleXlsx = async () => {
    if (!xlsxUrl) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const host = window.location.hostname;
      const subdomain = host.split('.')[0];
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

      const response = await fetch(`${baseUrl}${xlsxUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': subdomain,
        },
      });

      if (!response.ok) throw new Error(t('analyticsDownloadError'));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = xlsxFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const showPdfButton = Boolean(pdf) || Boolean(onPdf);

  return (
    <div className="flex align-items-center gap-2">
      {pdfError && (
        <span className="text-red-500 text-xs" title={pdfError}>
          {t('analyticsPdfError')}
        </span>
      )}

      {xlsxUrl && (
        <Button
          label={t('analyticsExportExcel')}
          icon="pi pi-file-excel"
          size="small"
          severity="success"
          outlined
          loading={downloading}
          onClick={handleXlsx}
          style={{ height: '2.25rem', borderRadius: '0.625rem', fontSize: '0.8125rem' }}
        />
      )}

      {showPdfButton && (
        <Button
          label={isGenerating ? t('analyticsPdfGenerating') : t('analyticsExportPdf')}
          icon="pi pi-file-pdf"
          size="small"
          severity="danger"
          outlined
          loading={isGenerating}
          disabled={isGenerating}
          onClick={pdf ? () => void downloadPdf() : onPdf}
          style={{ height: '2.25rem', borderRadius: '0.625rem', fontSize: '0.8125rem' }}
        />
      )}
    </div>
  );
};

export default ExportButtons;
