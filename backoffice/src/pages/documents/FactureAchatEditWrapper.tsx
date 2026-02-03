import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureAchatEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'achat', t);
  
  return (
    <DocumentEditPage
      documentType="facture"
      direction="achat"
      config={config}
      listRoute="/factures/achat"
    />
  );
}
