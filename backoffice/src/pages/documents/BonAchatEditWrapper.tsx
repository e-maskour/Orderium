import DocumentEditPage from './DocumentEditPage';
import { getDocumentConfig } from '../../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonAchatEditWrapper() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'achat', t);

  return (
    <DocumentEditPage
      documentType="bon_livraison"
      direction="achat"
      config={config}
      listRoute="/bon-achat"
    />
  );
}
