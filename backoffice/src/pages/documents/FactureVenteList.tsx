import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureVenteList() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'vente', t);
  
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
