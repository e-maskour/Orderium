import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureAchatList() {
  const config = getDocumentConfig('facture', 'achat');
  
  return (
    <DocumentListPage
      documentType="facture"
      direction="achat"
      config={config}
      createRoute="/factures/achat/create"
      editRoute="/factures/achat"
    />
  );
}
