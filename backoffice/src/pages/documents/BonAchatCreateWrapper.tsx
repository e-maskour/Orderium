import DocumentCreatePage from './DocumentCreatePage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonAchatCreateWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'achat', t);

  return (
    <DocumentCreatePage
      documentType="bon_livraison"
      direction="achat"
      config={config}
      listRoute="/bon-achat"
    />
  );
}
