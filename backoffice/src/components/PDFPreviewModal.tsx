import { useEffect, useState, useRef, useCallback } from 'react';
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

/** Session-scoped in-memory cache: pdfUrl → blob URL. Avoids re-downloading within the same session. */
const blobCache = new Map<string, string>();

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  const tenantMatch = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
  const tenantId = tenantMatch
    ? tenantMatch[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase()
    : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
  };
}

/** Exported so buttons can call this on mouseenter to pre-warm the blob cache before the modal opens. */
// eslint-disable-next-line react-refresh/only-export-components
export function prefetchPDF(pdfUrl: string): void {
  if (!pdfUrl || blobCache.has(pdfUrl)) return;
  fetch(pdfUrl, { headers: getAuthHeaders() })
    .then((res) => {
      if (!res.ok) return;
      return res.blob();
    })
    .then((blob) => {
      if (blob && !blobCache.has(pdfUrl)) {
        blobCache.set(pdfUrl, URL.createObjectURL(blob));
      }
    })
    .catch(() => {
      /* fail silently — modal will retry */
    });
}

export function PDFPreviewModal({ isOpen, onClose, pdfUrl, title }: PDFPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mobile = isMobileBrowser();

  const loadPDF = useCallback(() => {
    if (!pdfUrl) return;

    // Serve from in-memory cache instantly
    const cached = blobCache.get(pdfUrl);
    if (cached) {
      setBlobUrl(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setBlobUrl(null);

    fetch(pdfUrl, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(pdfUrl, url);
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!isOpen || !pdfUrl) return;
    return loadPDF();
  }, [isOpen, pdfUrl, loadPDF]);

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={title}
      modal
      dismissableMask
      maximizable
      className="pdf-preview-dialog"
      style={{ width: '92vw', maxWidth: '72rem', height: '82vh', maxHeight: '82vh' }}
      breakpoints={{ '960px': '96vw', '640px': '100vw' }}
      contentStyle={{
        height: 'calc(82vh - 2.75rem)',
        maxHeight: 'calc(82vh - 2.75rem)',
        padding: 0,
        position: 'relative',
        background: '#f1f5f9',
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <div
          className="flex align-items-center justify-content-center"
          style={{ position: 'absolute', inset: 0, background: '#f1f5f9', zIndex: 1 }}
        >
          <div className="text-center">
            <ProgressSpinner style={{ width: '3rem', height: '3rem' }} />
            <p className="font-medium mt-3" style={{ color: '#475569' }}>
              Chargement du PDF...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex align-items-center justify-content-center"
          style={{ position: 'absolute', inset: 0, background: '#f1f5f9', zIndex: 1 }}
        >
          <p style={{ color: '#ef4444', fontWeight: 600 }}>Erreur: {error}</p>
        </div>
      )}

      {blobUrl && !mobile && (
        <iframe
          src={blobUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={title}
        />
      )}

      {blobUrl && mobile && (
        <div
          className="flex align-items-center justify-content-center"
          style={{ position: 'absolute', inset: 0, background: '#f1f5f9', padding: '2rem' }}
        >
          <div className="text-center">
            <p className="font-medium mb-4" style={{ color: '#475569' }}>
              Appuyez sur le bouton ci-dessous pour ouvrir le PDF
            </p>
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: '#2563eb',
                color: '#fff',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
              }}
            >
              Ouvrir le PDF
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}
