import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function BonLivraisonList() {
  const config = getDocumentConfig('bon_livraison', 'vente');
  
  return (
    <DocumentListPage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      createRoute="/bons-livraison/create"
      editRoute="/bons-livraison"
    />
  );
}
