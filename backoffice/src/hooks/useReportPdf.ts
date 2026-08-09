import { useCallback, useState } from 'react';
import { analyticsService } from '../modules/analytics/analytics.service';
import type { AnyReportFilter, PdfReportSpec } from '../modules/analytics/analytics.interface';

interface UseReportPdfResult {
  /** Generates the PDF for the current filter and saves it to disk. */
  download: () => Promise<void>;
  /** True while the API renders the document. */
  isGenerating: boolean;
  /** Last failure message, or `null`. Cleared on the next attempt. */
  error: string | null;
}

/**
 * Generates and downloads the PDF for a report page.
 *
 * One hook serves all report pages: the page supplies its presentation spec and
 * the active filter, and the API renders the document from its own query.
 *
 * @param spec   - how the report should look; `null` disables the hook.
 * @param filter - the filter currently applied on screen.
 * @param locale - BCP-47 locale for number/date formatting in the PDF.
 */
export function useReportPdf(
  spec: PdfReportSpec | null | undefined,
  filter: AnyReportFilter,
  locale?: string,
): UseReportPdfResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async () => {
    if (!spec || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      const { blob, fileName } = await analyticsService.generateReportPdf(spec, filter, locale);
      saveBlob(blob, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setIsGenerating(false);
    }
  }, [spec, filter, locale, isGenerating]);

  return { download, isGenerating, error };
}

/** Triggers a browser download for a generated blob. */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
