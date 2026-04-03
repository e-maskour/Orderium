import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function FactureVenteEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('facture', 'vente', t);

  return (
    <DocumentEditPage
      documentType="facture"
      direction="vente"
      config={config}
      listRoute="/factures/vente"
    />
  );
}
