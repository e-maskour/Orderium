import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DemandeAchatCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'achat', t);
  
  return (
    <DocumentCreatePage
      documentType="devis"
      direction="achat"
      config={config}
      listRoute="/demande-prix"
    />
  );
}
