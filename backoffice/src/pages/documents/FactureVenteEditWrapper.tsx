import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureVenteEditWrapper() {
  const config = getDocumentConfig('facture', 'vente');
  
  return (
    <DocumentEditPage
      documentType="facture"
      direction="vente"
      config={config}
      listRoute="/factures/vente"
    />
  );
}
