import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function BonLivraisonCreateWrapper() {
  const config = getDocumentConfig('bon_livraison', 'vente');
  
  return (
    <DocumentCreatePage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      listRoute="/bons-livraison"
    />
  );
}
