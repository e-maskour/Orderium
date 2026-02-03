import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureAchatList() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'achat', t);
  
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
