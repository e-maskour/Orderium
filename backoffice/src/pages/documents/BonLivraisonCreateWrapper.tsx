import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonLivraisonCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'vente', t);

  return (
    <DocumentCreatePage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      listRoute="/bons-livraison"
    />
  );
}
