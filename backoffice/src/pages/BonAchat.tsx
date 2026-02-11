import DocumentListPage from './documents/DocumentListPage';
import { getDocumentConfig } from '../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function BonAchat() {
  const { t } = useLanguage();
  const config = getDocumentConfig('bon_livraison', 'achat', t);
  
  return (
    <DocumentListPage
      documentType="bon_livraison"
      direction="achat"
      config={config}
      createRoute="/bon-achat/create"
      editRoute="/bon-achat"
    />
  );
}
