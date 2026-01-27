import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function DevisVenteEditWrapper() {
  const config = getDocumentConfig('devis', 'vente');
  
  return (
    <DocumentEditPage
      documentType="devis"
      direction="vente"
      config={config}
      listRoute="/devis"
    />
  );
}
