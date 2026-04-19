import React, { useState } from 'react';
import { Button } from 'primereact/button';

interface ExportButtonsProps {
  xlsxUrl?: string;
  xlsxFilename?: string;
  onPdf?: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ xlsxUrl, xlsxFilename = 'rapport.xlsx', onPdf }) => {
  const [downloading, setDownloading] = useState(false);

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

      if (!response.ok) throw new Error('Erreur lors du téléchargement');

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

  return (
    <div className="flex gap-2">
      {xlsxUrl && (
        <Button
          label="Excel"
          icon="pi pi-file-excel"
          size="small"
          severity="success"
          outlined
          loading={downloading}
          onClick={handleXlsx}
          style={{ height: '2.25rem', borderRadius: '0.625rem', fontSize: '0.8125rem' }}
        />
      )}
      {onPdf && (
        <Button
          label="PDF"
          icon="pi pi-file-pdf"
          size="small"
          severity="danger"
          outlined
          onClick={onPdf}
          style={{ height: '2.25rem', borderRadius: '0.625rem', fontSize: '0.8125rem' }}
        />
      )}
    </div>
  );
};

export default ExportButtons;
