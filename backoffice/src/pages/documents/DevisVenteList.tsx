import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DevisVenteList() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'vente', t);

  return (
    <DocumentListPage
      documentType="devis"
      direction="vente"
      config={config}
      createRoute="/devis/create"
      editRoute="/devis"
    />
  );
}
