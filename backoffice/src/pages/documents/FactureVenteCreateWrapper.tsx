import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureVenteCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'vente', t);
  
  return (
    <DocumentCreatePage
      documentType="facture"
      direction="vente"
      config={config}
      listRoute="/factures/vente"
    />
  );
}
