import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DevisVenteCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'vente', t);
  
  return (
    <DocumentCreatePage
      documentType="devis"
      direction="vente"
      config={config}
      listRoute="/devis"
    />
  );
}
