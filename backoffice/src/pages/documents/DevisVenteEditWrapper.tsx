import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DevisVenteEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'vente', t);

  return (
    <DocumentEditPage documentType="devis" direction="vente" config={config} listRoute="/devis" />
  );
}
