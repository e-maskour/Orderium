import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { FileText } from 'lucide-react';

export default function Devis() {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileText}
          title="Devis"
          subtitle="Gérez vos devis clients"
        />
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600">Page en construction...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
