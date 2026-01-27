import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';

export default function FactureVenteList() {
  const config = getDocumentConfig('facture', 'vente');
  
  return (
    <DocumentListPage
      documentType="facture"
      direction="vente"
      config={config}
      createRoute="/factures/vente/create"
      editRoute="/factures/vente"
    />
  );
}
