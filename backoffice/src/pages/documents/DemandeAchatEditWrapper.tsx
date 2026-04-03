import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DemandeAchatEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'achat', t);

  return (
    <DocumentEditPage
      documentType="devis"
      direction="achat"
      config={config}
      listRoute="/demande-prix"
    />
  );
}
