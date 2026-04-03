import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonLivraisonEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'vente', t);

  return (
    <DocumentEditPage
      documentType="bon_livraison"
      direction="vente"
      config={config}
      listRoute="/bons-livraison"
    />
  );
}
