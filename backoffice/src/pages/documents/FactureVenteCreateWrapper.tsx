import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureVenteCreateWrapper() {
  const config = getDocumentConfig('facture', 'vente');
  
  return (
    <DocumentCreatePage
      documentType="facture"
      direction="vente"
      config={config}
      listRoute="/factures/vente"
    />
  );
}
