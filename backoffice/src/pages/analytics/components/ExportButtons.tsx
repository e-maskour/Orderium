import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useReportPdf } from '../../../hooks/useReportPdf';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { apiClient } from '../../../common/api/api-client';
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
  const [xlsxError, setXlsxError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const {
    download: downloadPdf,
    isGenerating,
    error: pdfError,
  } = useReportPdf(pdf, filter ?? {}, PDF_LOCALES[language] ?? 'fr-MA');

  const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  /**
   * Prefers the generic spec-driven export (same columns as screen and PDF,
   * available for every report). Falls back to a legacy per-report endpoint.
   * Both go through apiClient so auth and the tenant header are always set.
   */
  const handleXlsx = async () => {
    setDownloading(true);
    setXlsxError(null);
    try {
      if (pdf) {
        const { blob, fileName } = await analyticsService.generateReportXlsx(pdf, filter ?? {});
        saveBlob(blob, fileName);
      } else if (xlsxUrl) {
        const response = await apiClient.raw('GET', xlsxUrl);
        if (!response.ok) throw new Error(t('analyticsDownloadError'));
        saveBlob(await response.blob(), xlsxFilename);
      }
    } catch {
      setXlsxError(t('analyticsDownloadError'));
    } finally {
      setDownloading(false);
    }
  };

  const showXlsxButton = Boolean(pdf) || Boolean(xlsxUrl);
  const showPdfButton = Boolean(pdf) || Boolean(onPdf);

  const errorText = xlsxError ?? (pdfError ? t('analyticsPdfError') : null);

  return (
    <div className="ax-export">
      {errorText && (
        <span className="ax-export__error" role="alert" title={pdfError ?? undefined}>
          {errorText}
        </span>
      )}

      {showXlsxButton && (
        <button
          type="button"
          className="ax-btn ax-btn--excel"
          onClick={() => void handleXlsx()}
          disabled={downloading}
          aria-busy={downloading}
        >
          {downloading ? (
            <Loader2 className="ax-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet aria-hidden="true" />
          )}
          {t('analyticsExportExcel')}
        </button>
      )}

      {showPdfButton && (
        <button
          type="button"
          className="ax-btn ax-btn--pdf"
          onClick={pdf ? () => void downloadPdf() : onPdf}
          disabled={isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="ax-spin" aria-hidden="true" />
          ) : (
            <FileText aria-hidden="true" />
          )}
          {isGenerating ? t('analyticsPdfGenerating') : t('analyticsExportPdf')}
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
