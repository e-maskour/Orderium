import { useEffect, useState, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const mobile = isMobileBrowser();

  useEffect(() => {
    if (!isOpen || !pdfUrl) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setBlobUrl(null);

    const token = localStorage.getItem('adminToken');
    const tenantMatch = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
    const tenantId = tenantMatch
      ? tenantMatch[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase()
      : null;
    fetch(pdfUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // Revoke previous blob URL to free memory
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = url;
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, pdfUrl]);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    if (!isOpen && prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current);
      prevBlobUrl.current = null;
      setBlobUrl(null);
    }
  }, [isOpen]);

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

      {error && (
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: '#f1f5f9', zIndex: 1 }}>
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
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0, background: '#f1f5f9', padding: '2rem' }}>
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
