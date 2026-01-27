import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureAchatCreateWrapper() {
  const config = getDocumentConfig('facture', 'achat');
  
  return (
    <DocumentCreatePage
      documentType="facture"
      direction="achat"
      config={config}
      listRoute="/factures/achat"
    />
  );
}
