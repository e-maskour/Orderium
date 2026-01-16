import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { Truck } from 'lucide-react';

export default function BonLivraison() {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Truck}
          title="Bon de Livraison"
          subtitle="Gérez vos bons de livraison"
        />
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600">Page en construction...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
