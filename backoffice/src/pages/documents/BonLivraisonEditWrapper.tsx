import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function BonLivraisonEditWrapper() {
  const config = getDocumentConfig('bon_livraison', 'vente');
  
  return (
    <DocumentEditPage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      listRoute="/bons-livraison"
    />
  );
}
