import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureAchatEditWrapper() {
  const config = getDocumentConfig('facture', 'achat');
  
  return (
    <DocumentEditPage
      documentType="facture"
      direction="achat"
      config={config}
      listRoute="/factures/achat"
    />
  );
}
