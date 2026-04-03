import DocumentListPage from './DocumentListPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonLivraisonList() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'vente', t);

  return (
    <DocumentListPage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      createRoute="/bons-livraison/create"
      editRoute="/bons-livraison"
    />
  );
}
