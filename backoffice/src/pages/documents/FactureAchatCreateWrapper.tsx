import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureAchatCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'achat', t);
  
  return (
    <DocumentCreatePage
      documentType="facture"
      direction="achat"
      config={config}
      listRoute="/factures/achat"
    />
  );
}
