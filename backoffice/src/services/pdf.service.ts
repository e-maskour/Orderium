/**
 * Global PDF Service
 * Handles PDF preview and download for all document types (invoices, quotes, delivery notes)
 */

const API_URL = '/api';

export type DocumentType = 'invoice' | 'quote' | 'delivery-note' | 'receipt';
export type PDFMode = 'preview' | 'download';

interface PDFOptions {
  documentType: DocumentType;
  documentId: number;
  mode?: PDFMode;
}

class PDFService {
  /**
   * Get PDF URL for a document
   */
  getPDFUrl(
    documentType: DocumentType,
    documentId: number,
    mode: PDFMode = 'download'
  ): string {
    const endpoint = this.getEndpoint(documentType);
    return `${API_URL}/pdf/${endpoint}/${documentId}?mode=${mode}`;
  }

  /**
   * Get API endpoint based on document type
   */
  private getEndpoint(documentType: DocumentType): string {
    const endpoints: Record<DocumentType, string> = {
      invoice: 'invoice',
      quote: 'quote',
      'delivery-note': 'delivery-note',
      receipt: 'receipt',
    };
    return endpoints[documentType];
  }

  /**
   * Preview PDF in new window
   */
  async preview(options: PDFOptions): Promise<void> {
    const { documentType, documentId } = options;
    const url = this.getPDFUrl(documentType, documentId, 'preview');

    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error(
        'Le bloqueur de pop-ups a empêché l\'ouverture du PDF. Veuillez autoriser les pop-ups pour ce site.'
      );
    }
  }

  /**
   * Download PDF file
   */
  async download(options: PDFOptions): Promise<void> {
    const { documentType, documentId } = options;
    const url = this.getPDFUrl(documentType, documentId, 'download');

    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getFileName(documentType, documentId);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PDF download failed:', error);
      throw new Error('Échec du téléchargement du PDF');
    }
  }

  /**
   * Generate and execute PDF action based on mode
   */
  async generate(options: PDFOptions): Promise<void> {
    const mode = options.mode || 'download';
    
    if (mode === 'preview') {
      return this.preview(options);
    } else {
      return this.download(options);
    }
  }

  /**
   * Get file name for download
   */
  private getFileName(documentType: DocumentType, documentId: number): string {
    const typeNames: Record<DocumentType, string> = {
      invoice: 'Facture',
      quote: 'Devis',
      'delivery-note': 'BonDeLivraison',
      receipt: 'Recu',
    };
    return `${typeNames[documentType]}_${documentId}.pdf`;
  }

  /**
   * Get display label for document type
   */
  getDocumentLabel(documentType: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      invoice: 'Facture',
      quote: 'Devis',
      'delivery-note': 'Bon de livraison',
      receipt: 'Reçu',
    };
    return labels[documentType];
  }
}

// Export singleton instance
export const pdfService = new PDFService();

// Export class for typing
export default PDFService;
