import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function DevisVenteList() {
  const config = getDocumentConfig('devis', 'vente');
  
  return (
    <DocumentListPage
      documentType="devis"
      direction="vente"
      config={config}
      createRoute="/devis/create"
      editRoute="/devis"
    />
  );
}
