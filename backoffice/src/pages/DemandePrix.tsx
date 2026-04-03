import DocumentListPage from './documents/DocumentListPage';
import { getDocumentConfig } from '../modules/documents/types/document-config';
import { useLanguage } from '@/context/LanguageContext';

export default function DemandePrix() {
  const { t } = useLanguage();
  const config = getDocumentConfig('devis', 'achat', t);

  return (
    <DocumentListPage
      documentType="devis"
      direction="achat"
      config={config}
      createRoute="/demande-prix/create"
      editRoute="/demande-prix"
    />
  );
}
