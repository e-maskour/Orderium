import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function DevisVenteCreateWrapper() {
  const config = getDocumentConfig('devis', 'vente');
  
  return (
    <DocumentCreatePage
      documentType="devis"
      direction="vente"
      config={config}
      listRoute="/devis"
    />
  );
}
