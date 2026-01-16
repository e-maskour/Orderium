import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { FileQuestion } from 'lucide-react';

export default function DemandePrix() {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileQuestion}
          title="Demande de prix"
          subtitle="Gérez vos demandes de prix"
        />
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600">Page en construction...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
